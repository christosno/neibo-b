import { Router } from "express";

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

router.post("/", (req, res) => {
  res.status(200).json({
    message: "Walk created",
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
