import type { NextFunction, Request, Response } from "express";
import {
  InvalidMissionForValidationError,
  InvalidMissionValidationResponseError,
  MalformedMissionValidationResponseError,
  validateMission,
} from "../agents/mission-validator.agent.js";
import {
  AiProviderMalformedResponseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
} from "../ai/ai-provider.js";
import type { MissionValidationInput } from "../validations/mission-validation.validation.js";

export const createMissionValidationController = (provider: AiProvider) => {
  return async (
    req: Request<Record<string, never>, unknown, MissionValidationInput>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await validateMission(req.body.mission, provider);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidMissionForValidationError) {
        res.status(400).json({ message: "Mission structure is invalid" });
        return;
      }

      if (error instanceof AiProviderTimeoutError) {
        res.status(504).json({ message: "AI provider timed out" });
        return;
      }

      if (error instanceof AiProviderUnavailableError) {
        res.status(503).json({ message: "AI provider unavailable" });
        return;
      }

      if (
        error instanceof AiProviderMalformedResponseError ||
        error instanceof MalformedMissionValidationResponseError ||
        error instanceof InvalidMissionValidationResponseError
      ) {
        res.status(502).json({ message: "AI validator returned invalid data" });
        return;
      }

      next(error);
    }
  };
};
