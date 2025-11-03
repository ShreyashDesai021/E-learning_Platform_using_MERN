// server/controllers/test.controller.js
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import xlsx from "xlsx";
import { Test } from "../models/test.model.js";
import { TestAttempt } from "../models/testAttempt.model.js";
import { Course } from "../models/course.model.js";
import { uploadMedia } from "../utils/cloudinary.js";
import PDFDocument from "pdfkit"; // for certificate quick generation
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/user.model.js";

/**
 * Helper: ensure directory exists
 */
const ensureDir = async (dirPath) => {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // ignore if exists
  }
};

/**
 * Instructor uploads an Excel file for a course.
 * Expects multipart/form-data with 'file'
 */
export const uploadTestExcel = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id; // instructor
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // read file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows || rows.length === 0) {
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: "Excel contains no rows" });
    }

    // parse rows into questions
    const questions = [];
    let totalMarks = 0;
    let passingMarks = 0;
    let marksPerQuestionDefault = null;

    rows.forEach((r) => {
      // normalize headers (in case of spaces)
      const idx = Number(r.index ?? r["Index"] ?? r["index"]);
      const question = String(r.question ?? r["Question"] ?? r["question"] ?? "");
      const optA = String(
        r["option A"] ?? r["Option A"] ?? r["optionA"] ?? r["option_A"] ?? r["option a"] ?? ""
      );
      const optB = String(
        r["option B"] ?? r["Option B"] ?? r["optionB"] ?? r["option_B"] ?? r["option b"] ?? ""
      );
      const optC = String(
        r["option C"] ?? r["Option C"] ?? r["optionC"] ?? r["option_C"] ?? r["option c"] ?? ""
      );
      const optD = String(
        r["option D"] ?? r["Option D"] ?? r["optionD"] ?? r["option_D"] ?? r["option d"] ?? ""
      );
      const correct = String(
        r["correct_answer"] ??
          r["correct answer"] ??
          r["Correct Answer"] ??
          r["correct"] ??
          ""
      ).toUpperCase();
      const marksPerQuestion =
        Number(
          r["marks_per_question"] ??
            r["marks per question"] ??
            r["marksPerQuestion"] ??
            r["marks_per_q"] ??
            r["marks"] ??
            NaN
        ) || undefined;

      // total/passing marks (take from any row; authoritative column)
      if (!marksPerQuestionDefault && marksPerQuestion) marksPerQuestionDefault = marksPerQuestion;
      if (typeof r["total_marks_for_test"] !== "undefined") {
        totalMarks = Number(r["total_marks_for_test"]);
      } else if (typeof r["total marks for test"] !== "undefined") {
        totalMarks = Number(r["total marks for test"]);
      }
      if (typeof r["passing_marks_for_test"] !== "undefined") {
        passingMarks = Number(r["passing_marks_for_test"]);
      } else if (typeof r["passing marks for test"] !== "undefined") {
        passingMarks = Number(r["passing marks for test"]);
      }

      questions.push({
        index: idx,
        question,
        options: { A: optA, B: optB, C: optC, D: optD },
        correctAnswer: correct || "A",
        marksPerQuestion: marksPerQuestion ?? undefined,
      });
    });

    // If no explicit total/passing, compute defaults
    if (!totalMarks) {
      const per = marksPerQuestionDefault ?? Number(rows[0]?.marks_per_question ?? 1);
      totalMarks = (per || 1) * questions.length;
    }
    if (!passingMarks) {
      // default to 40% if not provided
      passingMarks = Math.ceil(totalMarks * 0.4);
    }

    // Ensure marksPerQuestion each question has value
    questions.forEach((q) => {
      q.marksPerQuestion = q.marksPerQuestion ?? Math.round(totalMarks / questions.length);
    });

    // Upsert test for course (remove previous test if exists)
    const existing = await Test.findOne({ courseId });
    if (existing) {
      existing.questions = questions;
      existing.totalMarks = totalMarks;
      existing.passingMarks = passingMarks;
      existing.createdBy = userId;
      await existing.save();
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(200).json({ message: "Test updated", test: existing });
    }

    const test = await Test.create({
      courseId,
      questions,
      totalMarks,
      passingMarks,
      createdBy: userId,
    });

    await fsp.unlink(req.file.path).catch(() => {});
    return res.status(201).json({ message: "Test created", test });
  } catch (err) {
    console.error("uploadTestExcel error:", err);
    return res.status(500).json({ message: "Failed to upload test" });
  }
};

/**
 * GET test for a course (student view)
 */
export const getTestForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const test = await Test.findOne({ courseId }).lean();
    if (!test) return res.status(200).json({ test: null });

    // return questions without revealing correctAnswer
    const safeQuestions = test.questions.map((q) => ({
      index: q.index,
      question: q.question,
      options: q.options,
      marksPerQuestion: q.marksPerQuestion,
    }));

    return res.status(200).json({
      test: {
        _id: test._id,
        questions: safeQuestions,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks,
      },
    });
  } catch (err) {
    console.error("getTestForCourse error:", err);
    return res.status(500).json({ message: "Failed to fetch test" });
  }
};


/**
 * Student submits answers -> grade, create attempt, optionally generate certificate (upload to Cloudinary)
 * Body: { answers: [{ index: Number, answer: "A"|"B"|"C"|"D" }, ... ] }
 */
/**
 * Student submits answers -> grade, create attempt, optionally generate certificate (upload to Cloudinary)
 * Body: { answers: [{ index: Number, answer: "A"|"B"|"C"|"D" }, ... ] }
 */
export const submitTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.id;
    const bodyAnswers = req.body.answers || [];

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: "Test not found" });

    // grade
    let totalObtained = 0;
    const answersDetailed = [];

    for (const q of test.questions) {
      const submitted = bodyAnswers.find((a) => Number(a.index) === Number(q.index));
      const chosen = submitted ? String(submitted.answer).toUpperCase() : null;
      const correct = String(q.correctAnswer).toUpperCase();
      const marks = Number(q.marksPerQuestion || 0);
      const marksObtained = chosen && chosen === correct ? marks : 0;
      totalObtained += marksObtained;
      answersDetailed.push({
        index: q.index,
        answer: chosen,
        marksObtained,
      });
    }

    const passed = totalObtained >= (test.passingMarks || 0);

    // create attempt
    const attempt = await TestAttempt.create({
      testId: test._id,
      courseId: test.courseId,
      userId,
      answers: answersDetailed,
      totalObtained,
      passed,
    });

    // if passed, generate certificate PDF and upload to Cloudinary
    if (passed) {
      try {
        // get user name (fall back to id string if not available)
        const user = await User.findById(userId).select("name");
        const userName = user?.name ?? String(userId);

        // create a simple PDF certificate in platform temp dir
        const doc = new PDFDocument({ size: "A4", margin: 50 });

        const tmpDir = os.tmpdir();
        const tmpFileName = `cert-${uuidv4()}.pdf`;
        const tmpPath = path.join(tmpDir, tmpFileName);
        const writeStream = fs.createWriteStream(tmpPath);
        doc.pipe(writeStream);

        // Build certificate content
        const course = await Course.findById(test.courseId).populate("creator", "name");
        doc.fontSize(28).text("Certificate of Completion", { align: "center" });
        doc.moveDown(1.5);
        doc.fontSize(20).text(`${course?.courseTitle ?? "Course"}`, { align: "center" });
        doc.moveDown(1);
        // USE user's name instead of id
        doc.fontSize(14).text(
          `This certifies that ${userName} has passed the course test.`,
          { align: "center" }
        );
        doc.moveDown(2);
        doc.fontSize(14).text(`Score: ${totalObtained} / ${test.totalMarks}`, { align: "center" });
        doc.moveDown(2);
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" });

        doc.end();

        // wait until stream finished
        await new Promise((resolve, reject) => {
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });

        // ensure uploads/certificates exists and copy tmp -> persistent local filename
        const certsDir = path.join(process.cwd(), "uploads", "certificates");
        await fsp.mkdir(certsDir, { recursive: true });

        const localFileName = `certificate-${attempt._id}.pdf`;
        const localAbsPath = path.join(certsDir, localFileName);

        // copy temp file into uploads/certificates (persist local copy)
        await fsp.copyFile(tmpPath, localAbsPath);

        // upload to cloudinary as raw (PDF). uploadMedia will try to unlink tmpPath in finally.
        const uploaded = await uploadMedia(tmpPath, {
          resource_type: "raw",
          folder: "lms_certificates",
        });

        // persist both local filename and cloud url to attempt (attempt schema already has certificateUrl)
        attempt.certificateFileName = localFileName;
        attempt.certificateUrl = uploaded?.secure_url ?? uploaded?.url ?? "";
        await attempt.save();

        console.log("Certificate local saved & attempt updated:", localFileName, "absPath:", localAbsPath);
        console.log("Certificate uploaded:", attempt.certificateUrl);
      } catch (err) {
        console.warn("Certificate generation/upload failed:", err);
        // do not fail test result on certificate generation failure
      }
    }

    return res.status(200).json({ attempt });
  } catch (err) {
    console.error("submitTest error:", err);
    return res.status(500).json({ message: "Failed to submit test" });
  }
};


/**
 * Get attempt by id (used by certificate page)
 */
export const getAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await TestAttempt.findById(attemptId)
      .populate("userId", "name email")
      .populate("courseId", "courseTitle");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    return res.status(200).json({ attempt });
  } catch (err) {
    console.error("getAttempt error:", err);
    return res.status(500).json({ message: "Failed to fetch attempt" });
  }
};

/**
 * Serve certificate PDF (proxy) for an attempt.
 * Route: GET /api/v1/test/attempt/:attemptId/certificate
 * Only the attempt owner (or admin if you add logic) may access.
 */
export const serveCertificate = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const myUserId = req.id;

    // load attempt (certificateUrl or certificateFileName must be present)
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    // permission check: only owner can fetch
    if (String(attempt.userId) !== String(myUserId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!attempt.certificateFileName && !attempt.certificateUrl) {
      return res.status(404).json({ message: "Certificate not available" });
    }

    // Helper: try to stream a local file path
    const tryStreamLocalFile = async (filePath) => {
      try {
        // prefer sync existence check to avoid noisy stack traces
        if (!fs.existsSync(filePath)) return false;
        const stat = await fsp.stat(filePath);
        if (!stat.isFile()) return false;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", String(stat.size));
        res.setHeader("Content-Disposition", `inline; filename="certificate-${attemptId}.pdf"`);

        const readStream = fs.createReadStream(filePath);
        readStream.on("error", (err) => {
          console.error("Local certificate readStream error:", err);
          try { res.end(); } catch (e) {}
        });
        readStream.pipe(res);
        console.log("Served local certificate from:", filePath);
        return true;
      } catch (err) {
        // treat as not found / not readable
        return false;
      }
    };

    // 1) If filename is provided, check common locations
    if (attempt.certificateFileName) {
      const fname = String(attempt.certificateFileName);
      const candidates = [
        path.join(process.cwd(), "uploads", "certificates", fname),
        path.join(process.cwd(), "uploads", fname),
        // also try when filename was stored with leading slash
        path.join(process.cwd(), fname.replace(/^\/+/, "")),
        // try absolute path if someone stored that
        fname,
      ];

      // debug log to help troubleshooting
      console.log("serveCertificate: trying local candidates for attempt:", attemptId, candidates);

      for (const c of candidates) {
        const ok = await tryStreamLocalFile(c);
        if (ok) return;
      }

      // If not found directly, try scanning the certificates folder for a file containing attempt id
      try {
        const certDir = path.join(process.cwd(), "uploads", "certificates");
        if (fs.existsSync(certDir)) {
          const files = await fsp.readdir(certDir);
          const matched = files.find((f) => f.includes(String(attemptId)));
          if (matched) {
            const foundPath = path.join(certDir, matched);
            const ok = await tryStreamLocalFile(foundPath);
            if (ok) return;
          }
        }
      } catch (err) {
        console.warn("serveCertificate: scanning certificates folder failed:", err);
      }

      console.warn("Local certificate not found in any candidate paths for attempt:", attemptId);
    }

    // 2) Fallback: fetch remote certificate (Cloudinary or other URL) and proxy it
    if (attempt.certificateUrl) {
      try {
        console.log("serveCertificate: fetching remote certificate for attempt:", attemptId, attempt.certificateUrl);
        const remoteResp = await fetch(attempt.certificateUrl, { method: "GET" });

        if (!remoteResp.ok) {
          console.warn("Failed to fetch remote certificate:", remoteResp.status, remoteResp.statusText);
          return res.status(502).json({ message: "Failed to retrieve certificate from storage" });
        }

        const contentType = remoteResp.headers.get("content-type") || "application/octet-stream";
        const contentLength = remoteResp.headers.get("content-length");
        res.setHeader("Content-Type", contentType);
        if (contentLength) res.setHeader("Content-Length", contentLength);
        res.setHeader("Content-Disposition", `inline; filename="certificate-${attemptId}.pdf"`);

        const body = remoteResp.body;

        // If Node readable stream (most server envs), pipe directly
        if (body && typeof body.pipe === "function") {
          body.on("error", (err) => {
            console.error("Remote stream error:", err);
            try { res.end(); } catch (e) {}
          });
          body.pipe(res);
          console.log("Proxied remote certificate (node stream) for attempt:", attemptId);
          return;
        }

        // If WHATWG stream (getReader), consume and forward
        if (body && typeof body.getReader === "function") {
          const reader = body.getReader();
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!res.write(Buffer.from(value))) {
                  await new Promise((r) => res.once("drain", r));
                }
              }
              res.end();
            } catch (err) {
              console.error("Error streaming remote certificate (web stream):", err);
              try { res.end(); } catch (e) {}
            }
          })();
          console.log("Proxied remote certificate (web stream) for attempt:", attemptId);
          return;
        }

        // Last resort: buffer entire thing and send
        const buffer = Buffer.from(await remoteResp.arrayBuffer());
        res.send(buffer);
        console.log("Proxied remote certificate (buffered) for attempt:", attemptId);
        return;
      } catch (err) {
        console.error("Error fetching remote certificate:", err);
        return res.status(502).json({ message: "Failed to retrieve certificate from storage" });
      }
    }

    // Nothing to serve
    return res.status(404).json({ message: "Certificate not available" });
  } catch (err) {
    console.error("serveCertificate error:", err);
    return res.status(500).json({ message: "Failed to serve certificate" });
  }
};


