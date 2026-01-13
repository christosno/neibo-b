import express from "express";
import { isTest } from "../env.ts";

import authRoutes from "./routes/authRoutes.ts";
import walkRoutes from "./routes/walkRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";

import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { errorHandler, notFound } from "./middleware/errorHandler.ts";
import aiRoutes from "./routes/aiRoutes.ts";

const app = express();

// Regular middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("dev", {
    skip: () => isTest(),
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "🚀 Hello from Neibo api - this is a test",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/walks", walkRoutes);
app.use("/api/users", userRoutes);
app.use("/api/gemini", aiRoutes);

// 404 handler - MUST come after all valid routes
app.use(notFound);

// Global error handler - MUST be last
app.use(errorHandler);

export { app };

export default app;
