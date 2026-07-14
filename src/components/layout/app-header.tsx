import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ThemeSelector } from "@/components/shared/theme-selector";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export async function AppHeader() {
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
        <div
          className="text-muted-foreground flex size-11 items-center justify-center rounded-md border md:size-9"
          aria-label={t("accountUnavailable")}
          title={t("accountUnavailable")}
        >
          <UserRound className="size-4" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
