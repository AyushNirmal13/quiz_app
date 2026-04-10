import { z } from "zod";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const registerSchema = z.object({
  name: requiredText("Name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: requiredText("Password"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
