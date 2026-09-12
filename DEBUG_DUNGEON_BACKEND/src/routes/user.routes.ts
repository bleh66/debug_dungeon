import { Router } from "express";
import { getLearningProfile } from "../controllers/learning.controller.js";
import { getRecommendations } from "../controllers/recommendation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me/learning-profile", authMiddleware, getLearningProfile);
router.get("/me/recommendations", authMiddleware, getRecommendations);

export default router;
