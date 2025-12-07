import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.ts";

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = await verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: "Forbidden" });
  }
};
