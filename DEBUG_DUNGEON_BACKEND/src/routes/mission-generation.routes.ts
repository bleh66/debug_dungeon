import { Router } from "express";
import { openAiProvider } from "../ai/openai.provider.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { createMissionGenerationController } from "../controllers/mission-generation.controller.js";
import { createMissionValidationController } from "../controllers/mission-validation.controller.js";
import { createMissionPipelineController } from "../controllers/mission-pipeline.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/authorization.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { missionGenerationInputSchema } from "../validations/mission-generation.validation.js";
import { missionValidationInputSchema } from "../validations/mission-validation.validation.js";
import { aiRateLimit } from "../middleware/rate-limit.middleware.js";

export const createMissionGenerationRouter = (
  provider: AiProvider = openAiProvider,
) => {
  const router = Router();

  router.post(
    "/generate",
    authMiddleware,
    requireRole("ADMIN"),
    aiRateLimit,
    validate(missionGenerationInputSchema),
    createMissionGenerationController(provider),
  );

  router.post(
    "/validate",
    authMiddleware,
    requireRole("ADMIN"),
    aiRateLimit,
    validate(missionValidationInputSchema),
    createMissionValidationController(provider),
  );

  router.post(
    "/generate-and-publish",
    authMiddleware,
    requireRole("ADMIN"),
    aiRateLimit,
    validate(missionGenerationInputSchema),
    createMissionPipelineController(provider),
  );

  return router;
};

export default createMissionGenerationRouter();
