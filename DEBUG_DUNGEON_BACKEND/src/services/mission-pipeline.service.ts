import { generateMission } from "../agents/mission-generator.agent.js";
import { validateMission } from "../agents/mission-validator.agent.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { openAiProvider } from "../ai/openai.provider.js";
import type { MissionValidationResult } from "../types/mission-validation-schema.js";
import type { MissionGenerationInput } from "../validations/mission-generation.validation.js";
import {
  persistGeneratedMission,
  type PublishedMission,
} from "./mission-persistence.service.js";

export type MissionPipelineResult =
  | {
      published: true;
      mission: PublishedMission;
    }
  | {
      published: false;
      validation: MissionValidationResult;
    };

export const generateValidateAndPublishMission = async (
  input: MissionGenerationInput,
  provider: AiProvider = openAiProvider,
): Promise<MissionPipelineResult> => {
  const mission = await generateMission(input, provider);
  const validation = await validateMission(mission, provider);

  if (!validation.valid) {
    return {
      published: false,
      validation,
    };
  }

  const publishedMission = await persistGeneratedMission(mission);

  return {
    published: true,
    mission: publishedMission,
  };
};
