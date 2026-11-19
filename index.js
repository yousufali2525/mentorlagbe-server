
import "dotenv/config";

import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectDB } from "./config/db.js";
import { initializeAuth, getAuth } from "./auth.js";

import tuitionRoutes from "./routes/tuitionRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to MentorLagbe API",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MentorLagbe Server is Running",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    initializeAuth();

    app.all("/api/auth/*", toNodeHandler(getAuth()));

    app.use(
      "/api/payments/webhook",
      express.raw({ type: "application/json" })
    );

    app.use(express.json({ limit: "12mb" }));

    app.use("/api/tuitions", tuitionRoutes);
    app.use("/api/applications", applicationRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/upload", uploadRoutes);
    app.use("/api/token", tokenRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/admin", adminRoutes);

    app.listen(PORT, () => {
      console.log(`MentorLagbe Server running on port ${PORT}`);
      console.log("Allowed frontend origins:", allowedOrigins);
    });
  } catch (error) {
    console.error("Server Startup Failed:", error.message);
    process.exit(1);
  }
};

startServer();
