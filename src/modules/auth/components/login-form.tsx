"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { FormMessage } from "@/modules/auth/components/form-message";
import {
  loginAction,
  type AuthActionError,
} from "@/modules/auth/server/actions";
import { loginSchema, type LoginValues } from "@/modules/auth/schemas";

const errorKeys: Record<AuthActionError, string> = {
  invalidFields: "invalidFields",
  authenticationFailed: "authenticationFailed",
  requestFailed: "requestFailed",
  invalidResetLink: "invalidResetLink",
  passwordUpdateFailed: "passwordUpdateFailed",
};

export function LoginForm() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Auth");
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", locale },
  });

  async function onSubmit(values: LoginValues) {
    const result = await loginAction({ ...values, locale });

    if (result.status === "error") {
      form.setError("root", { message: t(errorKeys[result.error]) });
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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Link
            href="/forgot-password"
            className="text-primary rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("forgotPasswordLink")}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={
            form.formState.errors.password ? "password-error" : undefined
          }
          disabled={form.formState.isSubmitting}
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p id="password-error" className="text-destructive text-sm">
            {t("passwordRequired")}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={form.formState.isSubmitting}
      >
        <LogIn aria-hidden="true" />
        {form.formState.isSubmitting ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
