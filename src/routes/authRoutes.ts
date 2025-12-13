import { Router } from "express";
import { login, register } from "../controllers/authController.ts";
import { validateBody } from "../middleware/validation.ts";
import { userInsertSchema } from "../db/schema.ts";
import z from "zod";

const router = Router();

// auth/register
const registerSchema = userInsertSchema.extend({
  email: z.email("Invalid email format"),
  username: z.string().min(1, "Username is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => val.length >= 8, {
      message: "Password must be at least 8 characters long",
    }),
});

router.post("/register", validateBody(registerSchema), register);

// auth/login
const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z
    .string()
    .optional()
    .refine((val) => val !== undefined, {
      message: "Password is required",
    })
    .refine((val) => val !== undefined && val.length >= 8, {
      message: "Password must be at least 8 characters long",
    }),
});

router.post("/login", validateBody(loginSchema), login);

export default router;
