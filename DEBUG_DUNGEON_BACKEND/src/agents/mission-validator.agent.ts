import { z } from "zod";
import type { AiProvider } from "../ai/ai-provider.js";
import { openAiProvider } from "../ai/openai.provider.js";
import {
  missionValidationResultSchema,
  type MissionValidationResult,
} from "../types/mission-validation-schema.js";
import { missionForValidationSchema } from "../validations/mission-validation.validation.js";
import { MISSION_VALIDATOR_SYSTEM_PROMPT } from "./mission-validator.prompt.js";

export class InvalidMissionForValidationError extends Error {
  constructor() {
    super("Mission failed deterministic validation");
    this.name = "InvalidMissionForValidationError";
  }
}

export class MalformedMissionValidationResponseError extends Error {
  constructor() {
    super("Mission validator returned malformed JSON");
    this.name = "MalformedMissionValidationResponseError";
  }
}

export class InvalidMissionValidationResponseError extends Error {
  constructor() {
    super("Mission validator returned an invalid result structure");
    this.name = "InvalidMissionValidationResponseError";
  }
}

export const validateMission = async (
  missionInput: unknown,
  provider: AiProvider = openAiProvider,
): Promise<MissionValidationResult> => {
  const missionResult = missionForValidationSchema.safeParse(missionInput);

  if (!missionResult.success) {
    throw new InvalidMissionForValidationError();
  }

  const mission = missionResult.data;
  const requestedResultSchema = missionValidationResultSchema.superRefine(
    (result, context) => {
      result.issues.forEach((issue, issueIndex) => {
        if (
          issue.questionIndex !== null &&
          issue.questionIndex >= mission.questions.length
        ) {
          context.addIssue({
            code: "custom",
            path: ["issues", issueIndex, "questionIndex"],
            message: "questionIndex must reference a supplied question",
          });
        }
      });
    },
  );
  const { $schema: _schemaVersion, ...jsonSchema } = z.toJSONSchema(
    requestedResultSchema,
  ) as Record<string, unknown>;

  const rawResponse = await provider.generateStructured({
    schemaName: "debug_dungeon_mission_validation",
    jsonSchema,
    systemPrompt: MISSION_VALIDATOR_SYSTEM_PROMPT,
    input: { mission },
  });

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(rawResponse);
  } catch {
    throw new MalformedMissionValidationResponseError();
  }

  const validationResult = requestedResultSchema.safeParse(parsedResponse);

  if (!validationResult.success) {
    throw new InvalidMissionValidationResponseError();
  }

  const issues = validationResult.data.issues;

  return {
    valid: !issues.some((issue) => issue.severity === "ERROR"),
    issues,
  };
};
