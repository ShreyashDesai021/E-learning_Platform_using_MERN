// server/index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./database/db.js";
import testRoute from "./routes/test.route.js";

// Import controllers for webhook route (we will use stripeWebhook directly)
import { stripeWebhook } from "./controllers/coursePurchase.controller.js";

import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";

// --- small safe debug (remove in production) ---
console.log("=== ENV DEBUG ===");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Loaded" : "NOT LOADED");
console.log("PORT:", process.env.PORT || "not set");
console.log("CLIENT_URL:", process.env.CLIENT_URL || "http://localhost:5173");
console.log("=== END DEBUG ===");

const app = express();

// Use environment variable for the client origin (changeable for prod)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "stripe-signature"],
  })
);

// Stripe webhook MUST receive raw body (express.json would consume it). Register webhook BEFORE express.json
// The webhook route will be: POST /api/v1/purchase/webhook
app.post(
  "/api/v1/purchase/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Now normal body parsers and other middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());

// Simple request logger to help debug incoming requests (remove or reduce in production)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Basic health-check
app.get("/health", (req, res) => res.json({ status: "ok", time: Date.now() }));

// Register other routes (webhook already handled above)
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoute); // purchaseRoute will NOT re-register /webhook (see route file below)
app.use("/api/v1/progress", courseProgressRoute);
app.use("/api/v1/test", testRoute);

// Start server only after DB connects
const PORT = parseInt(process.env.PORT || "5000", 10);

async function startServer() {
  try {
    await connectDB(); // connectDB should handle mongoose.connect
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server — DB connection error:", err);
    process.exit(1);
  }
}

startServer();
