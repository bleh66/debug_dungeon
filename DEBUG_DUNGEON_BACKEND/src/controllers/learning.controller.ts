import { Request, Response } from "express";
import { getLearnerPerformanceSummary } from "../services/learning.service.js";

export const getLearningProfile = async (req: Request, res: Response) => {
  const summary = await getLearnerPerformanceSummary(req.user.userId);

  return res.status(200).json(summary);
};
