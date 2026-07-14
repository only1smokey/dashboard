import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ThemeSelector } from "@/components/shared/theme-selector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AppLocale } from "@/i18n/routing";
import { logoutAction } from "@/modules/auth/server/actions";

export async function AppHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Common");

  return (
    <header className="bg-background flex h-16 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger
          className="size-11 md:size-9"
          aria-label={t("toggleNavigation")}
        />
        <Separator orientation="vertical" className="h-5" />
        <span className="truncate text-sm font-semibold md:hidden">
          {t("appName")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSelector />
        <form action={logoutAction.bind(null, locale)}>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="size-11 md:size-9"
            aria-label={t("logout")}
            title={t("logout")}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </form>
      </div>
    </header>
  );
}
