import type { Request, Response } from "express";
import bcCrypt from "bcrypt";
import { db } from "../db/connection.ts";
import { users, type NewUser } from "../db/schema.ts";
import { generateToken } from "../utils/jwt.ts";
import { comparePasswords, hashPassword } from "../utils/passwords.ts";
import { eq } from "drizzle-orm";

export const register = async (req: Request<any, NewUser>, res: Response) => {
  try {
    const hashedPassword = await hashPassword(req.body.password);

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
    console.error("❌ Register failed:", error);
    res.status(500).json({
      error: "Failed to create user",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    return res
      .status(200)
      .json({
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
      })
      .status(201);
  } catch (error) {
    console.error("❌ Login failed:", error);
    res.status(500).json({
      error: "Failed to login",
    });
  }
};
