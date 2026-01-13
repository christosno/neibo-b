import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validation.ts";
import { generateTour } from "../controllers/aiControlers.ts";

const router = Router();

const generateTourSchema = z.object({
  city: z.string().min(1),
  neighborhood: z.string().min(1),
  duration: z.string().min(1),
  tourTheme: z.string().min(1),
  startLocation: z.string().min(1),
  userPreferences: z.string().min(1),
  pace: z.string().min(1),
  groupType: z.string().min(1),
  budget: z.string().min(1),
});

router.post("/generate-text", validateBody(generateTourSchema), generateTour);

export default router;
