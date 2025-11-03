// server/models/testAttempt.model.js
import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      index: Number,
      answer: String, // 'A' | 'B' | 'C' | 'D'
      marksObtained: Number,
    },
  ],
  totalObtained: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  certificateUrl: { type: String, default: "" }, // Cloudinary URL if generated
  // NEW: local filename (relative to server uploads/certificates/) used by proxy serve endpoint.
  certificateFileName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export const TestAttempt = mongoose.model("TestAttempt", attemptSchema);
