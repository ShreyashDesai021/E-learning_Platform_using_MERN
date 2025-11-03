// server/routes/test.route.js
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../utils/multer.js";
import {
  uploadTestExcel,
  getTestForCourse,
  submitTest,
  getAttempt,
  serveCertificate, // new exported function
} from "../controllers/test.controller.js";

const router = express.Router();

// Instructor uploads Excel (multipart/form-data)
router.post("/:courseId/upload", isAuthenticated, upload.single("file"), uploadTestExcel);

// Student fetch test for course
router.get("/:courseId", isAuthenticated, getTestForCourse);

// Student submit test by testId
router.post("/:testId/submit", isAuthenticated, submitTest);

// Fetch attempt by id (certificate/result)
router.get("/attempt/:attemptId", isAuthenticated, getAttempt);

// NEW: serve certificate (proxy) for attempt
router.get("/attempt/:attemptId/certificate", isAuthenticated, serveCertificate);

export default router;
