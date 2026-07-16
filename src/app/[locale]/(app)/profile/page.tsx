import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PageHeading } from "@/components/shared/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import type { AppLocale } from "@/i18n/routing";
import { requireActiveUser } from "@/modules/auth/server/access";
import { ProfileForm } from "@/modules/profile/components/profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const locale = (await getLocale()) as AppLocale;
  const [t, user] = await Promise.all([
    getTranslations("Profile"),
    requireActiveUser(locale),
  ]);

  return (
    <div className="space-y-8">
      <PageHeading title={t("title")} />
      <Card className="max-w-2xl shadow-xs">
        <CardContent>
          <ProfileForm
            avatarPath={user.avatarPath}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            email={user.email}
            preferredLocale={user.preferredLocale}
            userId={user.userId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
