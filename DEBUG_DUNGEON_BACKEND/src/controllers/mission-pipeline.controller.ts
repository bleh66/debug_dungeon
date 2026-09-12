import type { NextFunction, Request, Response } from "express";
import {
  InvalidGeneratedMissionError,
  MalformedMissionGenerationResponseError,
} from "../agents/mission-generator.agent.js";
import {
  InvalidMissionForValidationError,
  InvalidMissionValidationResponseError,
  MalformedMissionValidationResponseError,
} from "../agents/mission-validator.agent.js";
import {
  AiProviderMalformedResponseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
} from "../ai/ai-provider.js";
import { generateValidateAndPublishMission } from "../services/mission-pipeline.service.js";
import type { MissionGenerationInput } from "../validations/mission-generation.validation.js";

export const createMissionPipelineController = (provider: AiProvider) => {
  return async (
    req: Request<Record<string, never>, unknown, MissionGenerationInput>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await generateValidateAndPublishMission(
        req.body,
        provider,
      );

      if (!result.published) {
        res.status(422).json({
          message: "Generated mission failed semantic validation",
          validation: result.validation,
        });
        return;
      }

      res.status(201).json({
        message: "Mission generated and published successfully",
        mission: result.mission,
      });
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
        error instanceof MalformedMissionGenerationResponseError ||
        error instanceof InvalidGeneratedMissionError ||
        error instanceof InvalidMissionForValidationError ||
        error instanceof MalformedMissionValidationResponseError ||
        error instanceof InvalidMissionValidationResponseError
      ) {
        res.status(502).json({ message: "AI pipeline returned invalid data" });
        return;
      }

      next(error);
    }
  };
};
