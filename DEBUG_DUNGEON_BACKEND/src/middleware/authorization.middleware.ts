import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../generated/prisma/enums.js";
import { findUserRoleById } from "../services/authorization.service.js";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await findUserRoleById(userId);

      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
