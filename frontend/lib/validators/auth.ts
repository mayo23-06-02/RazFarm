import { z } from "zod";

const ESWATINI_PHONE_REGEX = /^(?:\+268)?\s?\d{7,8}$/;

export function isEswatiniPhone(value: string): boolean {
  return ESWATINI_PHONE_REGEX.test(value.trim());
}

export function isEmail(value: string): boolean {
  return z.email().safeParse(value.trim()).success;
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+268")) return digits;
  if (digits.startsWith("268")) return `+${digits}`;
  return `+268${digits.replace(/^0+/, "")}`;
}

export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Enter your email or phone number")
  .refine((v) => isEmail(v) || isEswatiniPhone(v), {
    message: "Enter a valid email or Eswatini phone number",
  });

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number")
  .refine(isEswatiniPhone, {
    message: "Enter a valid Eswatini number (7–8 digits)",
  });

export const passwordSchema = z.string().min(8, "Use at least 8 characters");

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    phone: phoneSchema,
    email: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
    associationName: z.string().trim().min(2, "Enter your association name"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    terms: z.boolean().refine((v) => v === true, {
      message: "Accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const acceptInviteSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

export type PasswordStrength = "weak" | "fair" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (!password || score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}
