// server/controllers/coursePurchase.controller.js

import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";

/* -------------------------- Stripe Lazy Loader -------------------------- */
let stripeInstance = null;
function getStripe() {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment.");
  }
  stripeInstance = new Stripe(key);
  return stripeInstance;
}

function maskKey(key = "") {
  if (!key) return "undefined";
  if (key.length <= 8) return "*****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/* ---------------------- Create Checkout Session ---------------------- */
// ⬇️ DEV MODE VERSION — marks payment "completed" immediately
export const createCheckoutSession = async (req, res) => {
  try {
    console.log(
      "createCheckoutSession: STRIPE_SECRET_KEY:",
      maskKey(process.env.STRIPE_SECRET_KEY)
    );

    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).json({ success: false, message: "Course not found!" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(401).json({ success: false, message: "User not found" });
    if (user.role === "instructor") {
      return res
        .status(403)
        .json({ success: false, message: "Instructors cannot purchase courses." });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      console.error("Stripe not configured:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Payment gateway not configured" });
    }

    // Create session on Stripe for realism
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: course.courseThumbnail ? [course.courseThumbnail] : [],
            },
            unit_amount: Math.round((course.coursePrice || 0) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/course-progress/${courseId}`,
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: {
        courseId: String(courseId),
        userId: String(userId),
      },
    });

    if (!session || !session.id) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to create checkout session" });
    }

    // ✅ DEV MODE: immediately mark as completed
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice || 0,
      status: "completed", // <-- instantly completed
      paymentId: session.id,
    });
    await newPurchase.save();

    // ✅ Instantly enroll user and course
    await User.findByIdAndUpdate(userId, {
      $addToSet: { enrolledCourses: course._id },
    });
    await Course.findByIdAndUpdate(course._id, {
      $addToSet: { enrolledStudents: userId },
    });

    console.log(
      `✅ [DEV MODE] Purchase auto-completed: user ${userId} enrolled in course ${course._id}`
    );

    return res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

/* ------------------ Keep Webhook for Later (no change) ------------------ */
export const stripeWebhook = async (req, res) => {
  // In dev mode, webhook is optional, so we just acknowledge quickly
  console.log("⚙️ Stripe webhook received (DEV MODE) — skipping processing.");
  res.status(200).send();
};

/* ------------------ Get Course Detail + Purchase Status ------------------ */
export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate("creator")
      .populate("lectures");

    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found!" });

    const purchased = await CoursePurchase.findOne({
      userId,
      courseId,
      status: "completed",
    });

    res.status(200).json({
      success: true,
      course,
      purchased: !!purchased,
    });
  } catch (err) {
    console.error("getCourseDetailWithPurchaseStatus error:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

/* -------------------- Get All Completed Purchased Courses -------------------- */
export const getAllPurchasedCourse = async (_, res) => {
  try {
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");
    res
      .status(200)
      .json({ success: true, purchasedCourse: purchasedCourse || [] });
  } catch (err) {
    console.error("getAllPurchasedCourse error:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
