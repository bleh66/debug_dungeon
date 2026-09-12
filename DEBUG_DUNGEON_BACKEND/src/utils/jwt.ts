import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "../types/jwt.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || (process.env.NODE_ENV === "production" && secret.length < 32)) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
};

export const generateToken = (userId: string) => {
  const payload: AuthTokenPayload = { userId };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: "1h" });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    decoded.userId.length === 0
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  return decoded as AuthTokenPayload;
};
