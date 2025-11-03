import PDFDocument from "pdfkit";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { uploadMedia } from "./cloudinary.js";

export const generateCertificate = async (studentName, courseTitle) => {
  const certId = uuidv4().slice(0, 8);
  const filePath = `uploads/cert-${certId}.pdf`;
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(26).text("Certificate of Completion", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(18).text(`Awarded to`, { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(22).text(studentName, { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(16)
     .text(`for successfully completing the course`, { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(18).text(courseTitle, { align: "center" });
  doc.moveDown(2);
  doc.fontSize(12).text(`Certificate ID: ${certId}`, { align: "center" });
  doc.end();

  await new Promise((resolve) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    stream.on("finish", resolve);
  });

  // upload to Cloudinary
  const uploaded = await uploadMedia(filePath, { folder: "lms_certificates", resource_type: "raw" });
  return uploaded.secure_url;
};
