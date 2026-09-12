import { z } from "zod";

export const missionValidationIssueTypeSchema = z.enum([
  "CORRECTNESS",
  "EXPLANATION",
  "CONCEPT",
  "TOPIC",
  "DIFFICULTY",
  "AMBIGUITY",
  "QUALITY",
  "DUPLICATION",
]);

export const missionValidationSeveritySchema = z.enum(["ERROR", "WARNING"]);

export const missionValidationIssueSchema = z
  .object({
    questionIndex: z.number().int().nonnegative().nullable(),
    type: missionValidationIssueTypeSchema,
    severity: missionValidationSeveritySchema,
    message: z.string().trim().min(1),
  })
  .strict();

export const missionValidationResultSchema = z
  .object({
    valid: z.boolean(),
    issues: z.array(missionValidationIssueSchema),
  })
  .strict();

export type MissionValidationResult = z.infer<
  typeof missionValidationResultSchema
>;
