import express from "express";
import { isTest } from "../env.ts";

import authRoutes from "./routes/authRoutes.ts";
import walkRoutes from "./routes/walkRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";

import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

const app = express();

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

app.use("/api/auth", authRoutes);
app.use("/api/walks", walkRoutes);
app.use("/api/users", userRoutes);

export { app };

export default app;
