import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AuthCard } from "@/modules/auth/components/auth-card";
import { FormMessage } from "@/modules/auth/components/form-message";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentUserAccess } from "@/modules/auth/server/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const [{ locale }, query, access, t, tCommon] = await Promise.all([
    params,
    searchParams,
    getCurrentUserAccess(),
    getTranslations("Auth"),
    getTranslations("Common"),
  ]);

  if (access) {
    redirect(`/${locale}`);
  }

  return (
    <AuthCard
      appName={tCommon("appName")}
      title={t("loginTitle")}
      description={t("loginDescription")}
    >
      <div className="space-y-5">
        {query.status === "password-updated" ? (
          <FormMessage variant="success">{t("passwordUpdated")}</FormMessage>
        ) : null}
        {query.error === "invalid-callback" ? (
          <FormMessage>{t("invalidResetLink")}</FormMessage>
        ) : null}
        <LoginForm />
      </div>
    </AuthCard>
  );
}
