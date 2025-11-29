import { Router } from "express";
import { validateBody } from "../middleware/validation.ts";
import { z } from "zod";

const createWalkSchema = z.object({
  name: z.string().min(1),
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

router.put("/:id", (req, res) => {
  res.status(200).json({
    message: `Walk ${req.params.id} updated`,
  });
});

router.delete("/:id", (req, res) => {
  res.status(200).json({
    message: `Walk ${req.params.id} deleted`,
  });
});

export default router;
