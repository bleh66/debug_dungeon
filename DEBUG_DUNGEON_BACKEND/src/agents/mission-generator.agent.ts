import { z } from "zod";
import {
  createGeneratedMissionSchema,
  type GeneratedMission,
} from "../types/mission-schema.js";
import type { MissionGenerationInput } from "../validations/mission-generation.validation.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { openAiProvider } from "../ai/openai.provider.js";
import { MISSION_GENERATOR_SYSTEM_PROMPT } from "./mission-generator.prompt.js";

export class MalformedMissionGenerationResponseError extends Error {
  constructor() {
    super("Mission generator returned malformed JSON");
    this.name = "MalformedMissionGenerationResponseError";
  }
}

export class InvalidGeneratedMissionError extends Error {
  constructor() {
    super("Mission generator returned an invalid mission structure");
    this.name = "InvalidGeneratedMissionError";
  }
}

const createRequestedMissionSchema = (input: MissionGenerationInput) => {
  return createGeneratedMissionSchema(input.questionCount).superRefine(
    (mission, context) => {
      if (mission.topic !== input.topic) {
        context.addIssue({
          code: "custom",
          path: ["topic"],
          message: "Generated topic must match the requested topic",
        });
      }

      if (mission.difficulty !== input.difficulty) {
        context.addIssue({
          code: "custom",
          path: ["difficulty"],
          message: "Generated difficulty must match the requested difficulty",
        });
      }
    },
  );
};

export const generateMission = async (
  input: MissionGenerationInput,
  provider: AiProvider = openAiProvider,
): Promise<GeneratedMission> => {
  const requestedMissionSchema = createRequestedMissionSchema(input);
  const { $schema: _schemaVersion, ...jsonSchema } = z.toJSONSchema(
    requestedMissionSchema,
  ) as Record<string, unknown>;

  const rawResponse = await provider.generateStructured({
    schemaName: "debug_dungeon_mission",
    jsonSchema,
    systemPrompt: MISSION_GENERATOR_SYSTEM_PROMPT,
    input,
  });

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(rawResponse);
  } catch {
    throw new MalformedMissionGenerationResponseError();
  }

  const result = requestedMissionSchema.safeParse(parsedResponse);

  if (!result.success) {
    throw new InvalidGeneratedMissionError();
  }

  return result.data;
};
