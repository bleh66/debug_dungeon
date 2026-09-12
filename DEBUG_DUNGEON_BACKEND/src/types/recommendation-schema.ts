import { z } from "zod";
import { difficultySchema } from "./mission-schema.js";

export const recommendationPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

const recommendedMissionSchema = z
  .object({
    id: z.string().min(1),
    missionNumber: z.number().int().positive(),
    title: z.string().min(1),
    topic: z.string().min(1),
    difficulty: difficultySchema,
  })
  .strict();

export const conceptRecommendationSchema = z
  .object({
    concept: z.string().min(1),
    attempted: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    incorrect: z.number().int().nonnegative(),
    accuracy: z.number().int().min(0).max(100),
    classification: z.enum(["weak", "developing", "strong"]),
    priority: recommendationPrioritySchema,
    reason: z.string().min(1),
    mission: recommendedMissionSchema.nullable(),
  })
  .strict();

export const learningRecommendationsSchema = z
  .object({
    totalQuestionsAttempted: z.number().int().nonnegative(),
    totalCorrect: z.number().int().nonnegative(),
    totalIncorrect: z.number().int().nonnegative(),
    overallAccuracy: z.number().int().min(0).max(100),
    nextFocus: conceptRecommendationSchema.nullable(),
    recommendations: z.array(conceptRecommendationSchema),
  })
  .strict();

export type LearningRecommendations = z.infer<
  typeof learningRecommendationsSchema
>;
