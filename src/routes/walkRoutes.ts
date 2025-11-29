import { Router } from "express";
import { validateBody, validateParams } from "../middleware/validation.ts";
import { z } from "zod";

const createWalkSchema = z.object({
  name: z.string().min(1),
});

const updateWalkSchema = z.object({
  name: z.string().min(1),
});

const updateWalkParamsSchema = z.object({
  id: z.string().min(1),
});

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Walks fetched",
  });
});

router.get("/:id", (req, res) => {
  res.status(200).json({
    message: `Walk ${req.params.id} fetched`,
  });
});

router.post("/", validateBody(createWalkSchema), (req, res) => {
  res.status(200).json({
    message: `Walk ${req.body.name} created`,
  });
});

router.put(
  "/:id",
  [validateParams(updateWalkParamsSchema), validateBody(updateWalkSchema)],
  (req, res) => {
    res.status(200).json({
      message: `Walk ${req.params.id} updated`,
    });
  }
);

router.delete("/:id", (req, res) => {
  res.status(200).json({
    message: `Walk ${req.params.id} deleted`,
  });
});

export default router;
