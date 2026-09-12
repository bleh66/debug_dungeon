import { z } from "zod";

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

const generatedOptionSchema = z
  .object({
    text: z.string().trim().min(1),
    isCorrect: z.boolean(),
    displayOrder: z.number().int().min(1).max(4),
  })
  .strict();

const generatedQuestionSchema = z
  .object({
    text: z.string().trim().min(1),
    concept: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
    xpReward: z.number().int().positive(),
    options: z.array(generatedOptionSchema).length(4),
  })
  .strict()
  .superRefine((question, context) => {
    const correctOptionCount = question.options.filter(
      (option) => option.isCorrect,
    ).length;

    if (correctOptionCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Each question must have exactly one correct option",
      });
    }

    const displayOrders = question.options.map(
      (option) => option.displayOrder,
    );

    if (new Set(displayOrders).size !== displayOrders.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option displayOrder values must be unique",
      });
    }
  });

export const generatedMissionSchema = z.object({
  title: z.string().trim().min(1),

  topic: z.string().trim().min(1),

  difficulty: difficultySchema,

  questions: z.array(generatedQuestionSchema).min(1),
}).strict();

export const createGeneratedMissionSchema = (questionCount: number) =>
  generatedMissionSchema.extend({
    questions: z.array(generatedQuestionSchema).length(questionCount),
  });

export type GeneratedMission = z.infer<
  typeof generatedMissionSchema
>;
