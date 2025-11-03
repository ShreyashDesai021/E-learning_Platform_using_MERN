// server/utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs/promises"; // to remove temp files
dotenv.config();

// Ensure env values exist — helpful debug during development
if (!process.env.CLOUD_NAME || !process.env.API_KEY || !process.env.API_SECRET) {
  console.warn("Cloudinary env vars are missing (CLOUD_NAME/API_KEY/API_SECRET). Uploads will fail.");
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

/**
 * Upload file to Cloudinary.
 * @param {string} filePath - local file path (multer saves to uploads/)
 * @param {object} opts - optional cloudinary upload options (resource_type, folder, etc.)
 * @returns normalized result object { secure_url, public_id, resource_type, raw }
 */
export const uploadMedia = async (filePath, opts = {}) => {
  try {
    // default resource_type 'auto' lets Cloudinary determine image/video
    const uploadOptions = {
      resource_type: opts.resource_type ?? "auto",
      folder: opts.folder ?? "lms_app",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...opts,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // normalize return so calling code gets expected keys
    const normalized = {
      secure_url: result.secure_url,
      url: result.url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      raw: result,
    };

    return normalized;
  } catch (error) {
    console.error("uploadMedia error:", error);
    throw error;
  } finally {
    // Try to delete the local file regardless of success/failure to keep uploads/ clean.
    // If deletion fails, don't throw — just log.
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // It's okay if unlink fails (file may not exist); log for debugging.
      console.warn("Failed to remove temp file:", filePath, err?.message ?? err);
    }
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    // default is to delete images; if resource is video, call with resource_type:'video' elsewhere
    const res = await cloudinary.uploader.destroy(publicId);
    return res;
  } catch (error) {
    console.error("deleteMediaFromCloudinary error:", error);
    throw error;
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    return res;
  } catch (error) {
    console.error("deleteVideoFromCloudinary error:", error);
    throw error;
  }
};
