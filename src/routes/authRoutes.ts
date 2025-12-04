import { Router } from "express";
import { register } from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";
import { userInsertSchema } from "../db/schema.ts";

const router = Router();

router.post("/register", validateBody(userInsertSchema), register);

router.post("/login", (req, res) => {
  res.status(201).json({
    message: "Login successful",
  });
});

export default router;
