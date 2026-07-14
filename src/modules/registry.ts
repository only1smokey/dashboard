import { House, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleId = "home" | "settings";
export type NavigationLabelKey = "home" | "settings";

export interface DashboardModule {
  id: ModuleId;
  navigationLabel: NavigationLabelKey;
  route: "/" | "/settings";
  icon: LucideIcon;
  order: number;
  visibleInNavigation: boolean;
  adminOnly?: boolean;
}

export const moduleRegistry = [
  {
    id: "home",
    navigationLabel: "home",
    route: "/",
    icon: House,
    order: 10,
    visibleInNavigation: true,
  },
  {
    id: "settings",
    navigationLabel: "settings",
    route: "/settings",
    icon: Settings,
    order: 100,
    visibleInNavigation: true,
  },
] as const satisfies readonly DashboardModule[];

export const navigationModules = moduleRegistry
  .filter((module) => module.visibleInNavigation)
  .toSorted((first, second) => first.order - second.order);
