"use client";

import { House, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { navigationModules } from "@/modules/registry";

export function AppSidebar({ accountLabel }: { accountLabel: string }) {
  const pathname = usePathname();
  const tCommon = useTranslations("Common");
  const tNavigation = useTranslations("Navigation");
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b p-3">
        <Link
          href="/"
          className="ring-sidebar-ring hover:bg-sidebar-accent flex min-h-11 items-center gap-3 rounded-lg px-1.5 transition-colors outline-none group-data-[collapsible=icon]:justify-center focus-visible:ring-2"
          onClick={() => setOpenMobile(false)}
        >
          <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <House className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {tCommon("appName")}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tCommon("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationModules.map((module) => {
                const isActive =
                  module.route === "/"
                    ? pathname === "/"
                    : pathname.startsWith(module.route);

                return (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={tNavigation(module.navigationLabel)}
                      className="h-11 md:h-9"
                    >
                      <Link
                        href={module.route}
                        onClick={() => setOpenMobile(false)}
                      >
                        <module.icon aria-hidden="true" />
                        <span>{tNavigation(module.navigationLabel)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-3">
        <div
          className="text-muted-foreground flex min-h-11 items-center gap-3 px-1.5 text-sm group-data-[collapsible=icon]:justify-center"
          aria-label={accountLabel}
        >
          <UserRound className="size-5 shrink-0" aria-hidden="true" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {accountLabel}
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
