"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/i18n/routing";
import { FormMessage } from "@/modules/auth/components/form-message";
import { resetPasswordAction } from "@/modules/auth/server/actions";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/modules/auth/schemas";

export function ResetPasswordForm() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Auth");
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "", locale },
  });

  async function onSubmit(values: ResetPasswordValues) {
    const result = await resetPasswordAction({ ...values, locale });

    if (result.status === "error") {
      form.setError("root", { message: t(result.error) });
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {form.formState.errors.root?.message ? (
        <FormMessage>{form.formState.errors.root.message}</FormMessage>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPasswordLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={
            form.formState.errors.password ? "new-password-error" : undefined
          }
          disabled={form.formState.isSubmitting}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p id="new-password-error" className="text-destructive text-sm">
            {t("passwordRequirements")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          aria-describedby={
            form.formState.errors.confirmPassword
              ? "confirm-password-error"
              : undefined
          }
          disabled={form.formState.isSubmitting}
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword ? (
          <p id="confirm-password-error" className="text-destructive text-sm">
            {t("passwordMismatch")}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={form.formState.isSubmitting}
      >
        <KeyRound aria-hidden="true" />
        {form.formState.isSubmitting
          ? t("updatingPassword")
          : t("updatePassword")}
      </Button>
    </form>
  );
}
