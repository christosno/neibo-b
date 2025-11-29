import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  res.status(201).json({
    message: "Register successful",
  });
});

router.post("/login", (req, res) => {
  res.status(201).json({
    message: "Login successful",
  });
});

export default router;
