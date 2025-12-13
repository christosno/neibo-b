import type { NextFunction, Request, Response } from "express";
import bcCrypt from "bcrypt";
import { db } from "../db/connection.ts";
import { users, type NewUser } from "../db/schema.ts";
import { generateToken } from "../utils/jwt.ts";
import { comparePasswords, hashPassword } from "../utils/passwords.ts";
import { eq } from "drizzle-orm";
import type { CustomError } from "../middleware/errorHandler.ts";

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

    return res.status(201).json({
      message: "User created successfully",
      user,
      token,
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
    });
  } catch (error) {
    next(error);
  }
};
