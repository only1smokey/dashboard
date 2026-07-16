import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import type { CurrentUserAccess } from "@/modules/auth/server/access";
import type { ViewingRegion } from "@/modules/location/types";
import { getAvailableNavigationModules } from "@/modules/registry";
import { PresenceProvider } from "@/modules/presence/components/presence-provider";
import { PeoplePanel } from "@/modules/presence/components/people-interface";
import type { PresenceBootstrap } from "@/modules/presence/types";

export async function AppShell({
  children,
  locale,
  presenceBootstrap,
  user,
  viewingRegion,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  presenceBootstrap: PresenceBootstrap;
  user: CurrentUserAccess;
  viewingRegion: ViewingRegion | null;
}) {
  const t = await getTranslations("Common");
  const availableModuleIds = getAvailableNavigationModules(viewingRegion).map(
    (module) => module.id,
  );

  return (
    <PresenceProvider
      bootstrap={presenceBootstrap}
      currentUserId={user.userId}
      isAdmin={user.role === "admin"}
    >
      <SidebarProvider>
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground fixed top-3 left-3 z-50 -translate-y-20 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-transform focus:translate-y-0 motion-reduce:transition-none"
        >
          {t("skipContent")}
        </a>
        <AppSidebar
          accountLabel={user.displayName ?? user.email ?? t("account")}
          avatarUrl={user.avatarUrl}
          availableModuleIds={availableModuleIds}
          currentUserId={user.userId}
          displayName={user.displayName}
          isAdmin={user.role === "admin"}
        />
        <SidebarInset id="main-content" className="min-w-0">
          <AppHeader locale={locale} currentUserId={user.userId} />
          <div className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </div>
        </SidebarInset>
        <PeoplePanel currentUserId={user.userId} />
      </SidebarProvider>
    </PresenceProvider>
  );
}
