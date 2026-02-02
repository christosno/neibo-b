import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.ts";
import type { CustomError } from "./errorHandler.ts";

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
      const error = new Error("No token provided") as CustomError;
      error.status = 401;
      error.name = "UnauthorizedError";
      throw error;
    }

    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    // Convert JWT errors (expired, invalid, etc.) to UnauthorizedError
    const authError = new Error(
      (error as Error).message || "Invalid token"
    ) as CustomError;
    authError.status = 401;
    authError.name = "UnauthorizedError";
    next(authError);
  }
};
