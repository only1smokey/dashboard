import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/modules/auth/components/auth-card";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("resetPasswordTitle") };
}

export default async function ResetPasswordPage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("Auth"),
    getTranslations("Common"),
  ]);

  return (
    <AuthCard
      appName={tCommon("appName")}
      title={t("resetPasswordTitle")}
      description={t("resetPasswordDescription")}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
