import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

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
      <PageHeading title={t("title")} />
      <UsersAdmin users={data.users} currentUserId={data.currentUserId} />
    </div>
  );
}
