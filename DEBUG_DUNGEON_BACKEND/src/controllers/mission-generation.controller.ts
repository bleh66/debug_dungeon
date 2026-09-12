import { NextFunction, Request, Response } from "express";
import {
  InvalidGeneratedMissionError,
  MalformedMissionGenerationResponseError,
  generateMission,
} from "../agents/mission-generator.agent.js";
import {
  AiProviderMalformedResponseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
} from "../ai/ai-provider.js";
import type { MissionGenerationInput } from "../validations/mission-generation.validation.js";

export const createMissionGenerationController = (provider: AiProvider) => {
  return async (
    req: Request<Record<string, never>, unknown, MissionGenerationInput>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const mission = await generateMission(req.body, provider);

      res.status(200).json(mission);
    } catch (error) {
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
        error instanceof MalformedMissionGenerationResponseError
      ) {
        res.status(502).json({ message: "AI provider returned malformed data" });
        return;
      }

      if (error instanceof InvalidGeneratedMissionError) {
        res.status(502).json({ message: "Generated mission failed validation" });
        return;
      }

      next(error);
    }
  };
};
