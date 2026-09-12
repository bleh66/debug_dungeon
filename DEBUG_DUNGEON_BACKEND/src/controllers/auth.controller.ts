import type { Request, Response } from "express";
import {
  authenticateUser,
  findUserProfile,
  registerUser,
} from "../services/auth.service.js";
import { generateToken } from "../utils/jwt.js";
import type {
  LoginInput,
  RegisterInput,
} from "../validations/auth.validation.js";

export const register = async (
  req: Request<Record<string, never>, unknown, RegisterInput>,
  res: Response,
) => {
  const { email, password } = req.body;
  const result = await registerUser(email, password);

  if (!result.ok) {
    return res.status(409).json({
      message: "Email already exists",
    });
  }

  return res.status(201).json(result.user);
};

export const login = async (
  req: Request<Record<string, never>, unknown, LoginInput>,
  res: Response,
) => {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  return res.status(200).json({
    message: "Login successful",
    token: generateToken(user.id),
    user,
  });
};

export const getProfile = async (req: Request, res: Response) => {
  const user = await findUserProfile(req.user.userId);

  if (!user) {
    return res.status(404).json({
      message: "User doesn't exist",
    });
  }

  return res.status(200).json({ user });
};
