import { z } from "zod";

import { routing } from "../../i18n/routing.ts";

export const localeSchema = z.enum(routing.locales);

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1),
  locale: localeSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.email().trim(),
  locale: localeSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(1),
    locale: localeSchema,
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
