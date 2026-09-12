import { z } from "zod";
import { generatedMissionSchema } from "../types/mission-schema.js";
import { MAX_GENERATED_QUESTIONS } from "./mission-generation.validation.js";

export const missionForValidationSchema = generatedMissionSchema.refine(
  (mission) => mission.questions.length <= MAX_GENERATED_QUESTIONS,
  {
    path: ["questions"],
    message: `A mission may contain at most ${MAX_GENERATED_QUESTIONS} questions`,
  },
);

export const missionValidationInputSchema = z
  .object({
    mission: missionForValidationSchema,
  })
  .strict();

export type MissionValidationInput = z.infer<
  typeof missionValidationInputSchema
>;
