// server/models/test.model.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  question: { type: String, required: true },
  options: {
    A: { type: String },
    B: { type: String },
    C: { type: String },
    D: { type: String },
  },
  correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
  marksPerQuestion: { type: Number, default: 0 },
});

const testSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  questions: [questionSchema],
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Test = mongoose.model("Test", testSchema);
