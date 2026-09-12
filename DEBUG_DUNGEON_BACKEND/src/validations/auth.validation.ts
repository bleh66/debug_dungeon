import { z } from "zod";

export const registerSchema = z.object({
  email: z.email({ message: "Please enter valid email." }),
  password: z
    .string()
    .min(8, { message: "Password must have at least 8 characters" })
    .max(128, { message: "Password must have at most 128 characters" }),
});

export const loginSchema = z.object({
  email: z.email({ message: "Please enter valid email." }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password must have at most 128 characters" }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
