import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z
  .object({
    name: z.string().min(1).max(40),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
    dominantHand: z.enum(["right", "left", ""]).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords do not match",
    path: ["confirmPassword"],
  });
