import { House, Settings, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ViewingRegion } from "@/modules/location/types";
import {
  isModuleAvailable,
  type ModuleAvailability,
} from "@/modules/location/availability";

export type ModuleId = "home" | "profile" | "settings" | "adminUsers";
export type NavigationLabelKey = ModuleId;

export interface DashboardModule {
  id: ModuleId;
  navigationLabel: NavigationLabelKey;
  route: "/" | "/profile" | "/settings" | "/admin/users";
  icon: LucideIcon;
  order: number;
  visibleInNavigation: boolean;
  availability: ModuleAvailability;
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
    availability: { scope: "global" },
  },
  {
    id: "profile",
    navigationLabel: "profile",
    route: "/profile",
    icon: UserRound,
    order: 90,
    visibleInNavigation: true,
    availability: { scope: "global" },
  },
  {
    id: "settings",
    navigationLabel: "settings",
    route: "/settings",
    icon: Settings,
    order: 100,
    visibleInNavigation: true,
    availability: { scope: "global" },
  },
  {
    id: "adminUsers",
    navigationLabel: "adminUsers",
    route: "/admin/users",
    icon: ShieldCheck,
    order: 110,
    visibleInNavigation: true,
    availability: { scope: "global" },
    adminOnly: true,
  },
] as const satisfies readonly DashboardModule[];

export const navigationModules = moduleRegistry
  .filter((module) => module.visibleInNavigation)
  .toSorted((first, second) => first.order - second.order);

export function getAvailableNavigationModules(
  viewingRegion: ViewingRegion | null,
) {
  return navigationModules.filter((module) =>
    isModuleAvailable(module.availability, viewingRegion),
  );
}

export { isModuleAvailable };
export type { ModuleAvailability };
