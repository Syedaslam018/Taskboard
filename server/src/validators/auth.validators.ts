import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .refine((pw) => /[A-Z]/.test(pw), "Password must contain at least one uppercase letter")
      .refine((pw) => /[a-z]/.test(pw), "Password must contain at least one lowercase letter")
      .refine((pw) => /\d/.test(pw), "Password must contain at least one number")
      .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain at least one special character"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
