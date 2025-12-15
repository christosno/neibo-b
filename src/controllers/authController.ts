import type { NextFunction, Request, Response } from "express";
import bcCrypt from "bcrypt";
import { db } from "../db/connection.ts";
import { refreshTokens, users, type NewUser } from "../db/schema.ts";
import {
  generateRefreshToken,
  generateToken,
  verifyRefreshToken,
} from "../utils/jwt.ts";
import { comparePasswords, hashPassword } from "../utils/passwords.ts";
import { eq, and, gt } from "drizzle-orm";
import type { CustomError } from "../middleware/errorHandler.ts";
import env from "../../env.ts";
import { parseTimeToMs } from "../utils/parseTimeToMs.ts";

export const register = async (
  req: Request<any, NewUser>,
  res: Response,
  next: NextFunction
) => {
  try {
    const hashedPassword = await hashPassword(req.body.password);

    const emailExists = await db
      .select()
      .from(users)
      .where(eq(users.email, req.body.email));

    if (emailExists.length > 0) {
      const error = new Error("Email already in use") as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }

    const usernameExists = await db
      .select()
      .from(users)
      .where(eq(users.username, req.body.username));

    if (usernameExists.length > 0) {
      const error = new Error("Username already in use") as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }

    const [user] = await db
      .insert(users)
      .values({
        ...req.body,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      });

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(
        Date.now() + parseTimeToMs(env.JWT_REFRESH_EXPIRES_IN)
      ),
    });

    return res.status(201).json({
      message: "User created successfully",
      user,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      const error = new Error("Invalid credentials") as CustomError;
      error.status = 401;
      error.name = "UnauthorizedError";
      throw error;
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid credentials") as CustomError;
      error.status = 401;
      error.name = "UnauthorizedError";
      throw error;
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // delete the old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(
        Date.now() + parseTimeToMs(env.JWT_REFRESH_EXPIRES_IN)
      ),
    });

    return res.status(201).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      const error = new Error("Refresh token is required") as CustomError;
      error.status = 400;
      error.name = "ValidationError";
      throw error;
    }

    // Verify the refresh token JWT first
    let decoded: { id: string; email: string; username: string };
    try {
      decoded = await verifyRefreshToken(token);
    } catch (error) {
      const err = new Error("Invalid or expired refresh token") as CustomError;
      err.status = 401;
      err.name = "UnauthorizedError";
      throw err;
    }

    // Check if refresh token exists in database and is not expired
    const [existingRefreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          eq(refreshTokens.userId, decoded.id),
          gt(refreshTokens.expiresAt, new Date())
        )
      );

    if (!existingRefreshToken) {
      const error = new Error(
        "Invalid or expired refresh token"
      ) as CustomError;
      error.status = 401;
      error.name = "UnauthorizedError";
      throw error;
    }

    // Verify user still exists and is active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id));

    if (!user || !user.isActive) {
      const error = new Error("User not found or inactive") as CustomError;
      error.status = 401;
      error.name = "UnauthorizedError";
      throw error;
    }

    // Generate new access token
    const newAccessToken = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Generate new refresh token
    const newRefreshToken = await generateRefreshToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Delete old refresh token and save new one (token rotation)
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));

    await db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(
        Date.now() + parseTimeToMs(env.JWT_REFRESH_EXPIRES_IN)
      ),
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};
