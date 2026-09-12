import { z } from "zod";
import { difficultySchema } from "../types/mission-schema.js";

export const MIN_GENERATED_QUESTIONS = 1;
export const MAX_GENERATED_QUESTIONS = 10;

export const missionGenerationInputSchema = z
  .object({
    topic: z.string().trim().min(1).max(200),
    difficulty: difficultySchema,
    questionCount: z
      .number()
      .int()
      .min(MIN_GENERATED_QUESTIONS)
      .max(MAX_GENERATED_QUESTIONS),
  })
  .strict();

export type MissionGenerationInput = z.infer<
  typeof missionGenerationInputSchema
>;
