import express from "express";
import authRoutes from "./routes/authRoutes.ts";
import walkRoutes from "./routes/walkRoutes.ts";
import userRoutes from "./routes/userRoutes.ts";

const app = express();

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
