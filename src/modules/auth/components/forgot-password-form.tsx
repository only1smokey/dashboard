"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { FormMessage } from "@/modules/auth/components/form-message";
import { requestPasswordResetAction } from "@/modules/auth/server/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/modules/auth/schemas";

export function ForgotPasswordForm() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Auth");
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", locale },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    const result = await requestPasswordResetAction({ ...values, locale });

    if (result.status === "success") {
      setSubmitted(true);
      return;
    }

    form.setError("root", { message: t(result.error) });
  }

  return (
    <div className="space-y-5">
      {submitted ? (
        <FormMessage variant="success">{t("resetRequestSent")}</FormMessage>
      ) : (
        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          {form.formState.errors.root?.message ? (
            <FormMessage>{form.formState.errors.root.message}</FormMessage>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="h-11"
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby={
                form.formState.errors.email ? "email-error" : undefined
              }
              disabled={form.formState.isSubmitting}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p id="email-error" className="text-destructive text-sm">
                {t("emailInvalid")}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={form.formState.isSubmitting}
          >
            <Send aria-hidden="true" />
            {form.formState.isSubmitting
              ? t("sendingResetLink")
              : t("sendResetLink")}
          </Button>
        </form>
      )}
      <Button asChild variant="ghost" size="lg" className="h-11 w-full">
        <Link href="/login">
          <ArrowLeft aria-hidden="true" />
          {t("backToLogin")}
        </Link>
      </Button>
    </div>
  );
}
