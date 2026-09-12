import { Router } from "express";
import {
  completeMission,
  getMission,
  getMissionPerformance,
  getMissionProgress,
  restartMission,
  startMission,
  submitAnswer,
} from "../controllers/mission.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  answerSubmissionBodySchema,
  answerSubmissionParamsSchema,
  missionCompletionParamsSchema,
  missionParamsSchema,
} from "../validations/mission.validation.js";

const router = Router();

router.get(
  "/:missionId",
  authMiddleware,
  validate(missionParamsSchema, "params"),
  getMission,
);

router.get(
  "/:missionId/progress",
  authMiddleware,
  validate(missionParamsSchema, "params"),
  getMissionProgress,
);

router.get(
  "/:missionId/performance",
  authMiddleware,
  validate(missionParamsSchema, "params"),
  getMissionPerformance,
);

router.post(
  "/:missionId/start",
  authMiddleware,
  validate(missionParamsSchema, "params"),
  startMission,
);

router.post(
  "/:missionId/restart",
  authMiddleware,
  validate(missionParamsSchema, "params"),
  restartMission,
);

router.post(
  "/:missionId/attempts/:attemptId/questions/:questionId",
  authMiddleware,
  validate(answerSubmissionParamsSchema, "params"),
  validate(answerSubmissionBodySchema),
  submitAnswer,
);

router.post(
  "/:missionId/attempts/:attemptId/complete",
  authMiddleware,
  validate(missionCompletionParamsSchema, "params"),
  completeMission,
);

export default router;
