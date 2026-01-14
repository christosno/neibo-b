import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validation.ts";
import { generateTour } from "../controllers/aiControlers.ts";

const router = Router();

const generateTourSchema = z.object({
  city: z.string().min(1),
  neighborhood: z.string().min(1),
  duration: z.number().min(5),
  tourTheme: z.string().min(1),
  startLocation: z.string().optional(),
  language: z.string().optional(),
});

router.post("/create-tour", validateBody(generateTourSchema), generateTour);

export default router;
