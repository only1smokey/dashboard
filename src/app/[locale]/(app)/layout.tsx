import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";
import { isAppLocale } from "@/modules/auth/routing";
import { requireActiveUser } from "@/modules/auth/server/access";
import { routing } from "@/i18n/routing";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeCandidate } = await params;
  const locale = isAppLocale(localeCandidate)
    ? localeCandidate
    : routing.defaultLocale;
  const user = await requireActiveUser(locale);

  return (
    <AppShell locale={locale} user={user}>
      {children}
    </AppShell>
  );
}
