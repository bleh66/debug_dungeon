import { z } from "zod";

export const missionParamsSchema = z.object({
  missionId: z.cuid({ message: "Invalid mission ID" }),
});

export type MissionParams = z.infer<typeof missionParamsSchema>;

export const answerSubmissionParamsSchema = z.object({
  missionId: z.cuid({ message: "Invalid mission ID" }),
  attemptId: z.cuid({ message: "Invalid attempt ID" }),
  questionId: z.cuid({ message: "Invalid question ID" }),
});

export const answerSubmissionBodySchema = z.object({
  selectedOptionId: z.cuid({ message: "Invalid option ID" }),
});

export const missionCompletionParamsSchema = z.object({
  missionId: z.cuid({ message: "Invalid mission ID" }),
  attemptId: z.cuid({ message: "Invalid attempt ID" }),
});

export type AnswerSubmissionParams = z.infer<
  typeof answerSubmissionParamsSchema
>;

export type AnswerSubmissionBody = z.infer<
  typeof answerSubmissionBodySchema
>;

export type MissionCompletionParams = z.infer<
  typeof missionCompletionParamsSchema
>;
