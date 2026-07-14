import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Info } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import type { AppLocale } from "@/i18n/routing";
import { UsersAdmin } from "@/modules/admin/components/users-admin";
import { getAdminUsers } from "@/modules/admin/server/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminUsers");
  return { title: t("title") };
}

export default async function AdminUsersPage() {
  const locale = (await getLocale()) as AppLocale;
  const [t, data] = await Promise.all([
    getTranslations("AdminUsers"),
    getAdminUsers(locale),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading title={t("title")} description={t("intro")} />
      <div
        className="bg-muted/50 text-muted-foreground flex gap-3 rounded-lg border p-4 text-sm leading-6"
        role="note"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{t("emailLimitation")}</p>
      </div>
      <UsersAdmin users={data.users} currentUserId={data.currentUserId} />
    </div>
  );
}
