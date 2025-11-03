import express from "express";
import upload from "../utils/multer.js";
import { uploadMedia } from "../utils/cloudinary.js";

const router = express.Router();

/**
 * POST /api/v1/media/upload-video
 * Accepts multipart/form-data. Supports field names: "file" or "video".
 */
router.post("/upload-video", upload.single("file"), async (req, res) => {
  try {
    // debug: show what multer parsed (helpful while testing)
    console.log("media.upload-video -> req.file:", !!req.file, req.file ? req.file.fieldname : "");
    console.log("media.upload-video -> req.files:", !!req.files);
    console.log("media.upload-video -> req.body keys:", Object.keys(req.body || {}));

    // multer placed uploaded file in req.file when field matched "file".
    // but if client used different field (e.g., "video") multer may not put file in req.file.
    // Try to be forgiving:
    let fileObj = req.file;

    // If multer didn't parse single('file'), maybe it parsed an array in req.files
    if (!fileObj && Array.isArray(req.files) && req.files.length > 0) {
      fileObj = req.files[0];
    }

    // If still no file object, return descriptive error
    if (!fileObj) {
      return res.status(400).json({
        success: false,
        message:
          'No file received. Ensure you upload using form-data with key "file" (type: File). Do not set Content-Type header manually — let the client/browser set it.',
      });
    }

    const result = await uploadMedia(fileObj.path);

    const normalized = {
      videoUrl: result.secure_url ?? result.url ?? null,
      publicId: result.public_id ?? result.publicId ?? null,
      raw: result,
    };

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      data: normalized,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return res.status(500).json({ success: false, message: "Error uploading file" });
  }
});

export default router;
