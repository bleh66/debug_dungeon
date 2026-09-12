import type { Request, Response } from "express";
import { getLearningRecommendations } from "../services/recommendation.service.js";

export const getRecommendations = async (req: Request, res: Response) => {
  const recommendations = await getLearningRecommendations(req.user.userId);

  return res.status(200).json(recommendations);
};
