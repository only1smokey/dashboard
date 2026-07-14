import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/modules/auth/components/auth-card";
import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("forgotPasswordTitle") };
}

export default async function ForgotPasswordPage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("Auth"),
    getTranslations("Common"),
  ]);

  return (
    <AuthCard
      appName={tCommon("appName")}
      title={t("forgotPasswordTitle")}
      description={t("forgotPasswordDescription")}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
