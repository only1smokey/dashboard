import { Ban, LogOut } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AuthCard } from "@/modules/auth/components/auth-card";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";
import { logoutAction } from "@/modules/auth/server/actions";
import { getCurrentUserAccess } from "@/modules/auth/server/access";
import { getLoginPath } from "@/modules/auth/routing";

export default async function AccountDisabledPage() {
  const locale = (await getLocale()) as AppLocale;
  const [t, common, user] = await Promise.all([
    getTranslations("DisabledAccount"),
    getTranslations("Common"),
    getCurrentUserAccess(),
  ]);

  if (!user) redirect(getLoginPath(locale));
  if (user.isActive) redirect(`/${locale}`);

  return (
    <AuthCard
      appName={common("appName")}
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-5 text-center">
        <Ban
          className="text-muted-foreground mx-auto size-8"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm leading-6">{t("help")}</p>
        <form action={logoutAction.bind(null, locale)}>
          <Button type="submit" variant="outline" className="min-h-11 w-full">
            <LogOut aria-hidden="true" />
            {common("logout")}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
