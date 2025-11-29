import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Users fetched",
  });
});

router.get("/:id", (req, res) => {
  res.status(200).json({
    message: `User ${req.params.id} fetched`,
  });
});

router.post("/", (req, res) => {
  res.status(200).json({
    message: "User created",
  });
});

router.put("/:id", (req, res) => {
  res.status(200).json({
    message: `User ${req.params.id} updated`,
  });
});

router.delete("/:id", (req, res) => {
  res.status(200).json({
    message: `User ${req.params.id} deleted`,
  });
});

export default router;
