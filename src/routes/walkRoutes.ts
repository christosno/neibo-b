import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validation.ts";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.ts";
import {
  createWalk,
  getAllWalks,
  getWalkById,
  updateWalk,
} from "../controllers/walksController.ts";

const createWalkSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  coverImageUrl: z.string().optional(),
  duration_estimate: z.number().optional(),
  distance_estimate: z.number().optional(),
  isPublic: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
  spots: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      reach_radius: z.number().optional(),
      positionOrder: z.number(),
      imageUrls: z.array(z.string()).optional(),
      audioUrl: z.string().optional(),
    })
  ),
});

// const updateWalkSchema = z.object({
//   name: z.string().min(1),
// });

const walkIdParamsSchema = z.object({
  id: z.string().uuid("Invalid walk ID format"),
});

const router = Router();

// get all available walks
// /api/walks?page=2&limit=20
router.get("/", getAllWalks);

router.get("/:id", validateParams(walkIdParamsSchema), getWalkById);

router.post(
  "/",
  [validateBody(createWalkSchema), authenticateToken],
  createWalk
);

router.put(
  "/:id",
  [
    validateParams(walkIdParamsSchema),
    // validateBody(updateWalkSchema),
    authenticateToken,
  ],
  updateWalk
);

router.delete("/:id", authenticateToken, (req, res) => {
  res.status(200).json({
    message: `Walk ${req.params.id} deleted`,
  });
});

export default router;
