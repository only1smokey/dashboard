import { AppShell } from "@/components/layout/app-shell";
import type { ReactNode } from "react";
import { isAppLocale } from "@/modules/auth/routing";
import { requireActiveUser } from "@/modules/auth/server/access";
import { routing } from "@/i18n/routing";
import {
  getUserLocations,
  getViewingRegion,
} from "@/modules/location/server/data";
import { getPresenceBootstrap } from "@/modules/presence/server/data";

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
  const [locations, presenceBootstrap] = await Promise.all([
    getUserLocations(user.userId),
    getPresenceBootstrap(user, locale),
  ]);

  return (
    <AppShell
      locale={locale}
      presenceBootstrap={presenceBootstrap}
      user={user}
      viewingRegion={getViewingRegion(locations)}
    >
      {children}
    </AppShell>
  );
}
