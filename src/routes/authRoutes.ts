import { Router } from "express";
import { login, register } from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";
import { userInsertSchema } from "../db/schema.ts";
import z from "zod";

const router = Router();

router.post("/register", validateBody(userInsertSchema), register);

const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(255, "Password must be less than 255 characters long"),
});

router.post("/login", validateBody(loginSchema), login);

export default router;
