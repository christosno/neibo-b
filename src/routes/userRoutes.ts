import { Router } from "express";
import { authenticateToken } from "../middleware/auth.ts";
import { getWalksByUserCreator } from "../controllers/usersController.ts";

const router = Router();

router.use(authenticateToken);

router.get("/", (req, res) => {
  res.status(200).json({
    message: "Users fetched",
  });
});

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// get all walks that creates a user
router.get("/walks", getWalksByUserCreator);

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
