import "server-only";

import { redirect } from "next/navigation";

import type { AppLocale } from "@/i18n/routing";
import { requireActiveUser } from "@/modules/auth/server/access";
import {
  getUserLocations,
  getViewingRegion,
} from "@/modules/location/server/data";
import {
  isModuleAvailable,
  moduleRegistry,
  type ModuleId,
} from "@/modules/registry";

export async function requireModuleAvailability(
  moduleId: ModuleId,
  locale: AppLocale,
) {
  const user = await requireActiveUser(locale);
  const targetModule = moduleRegistry.find(
    (candidate) => candidate.id === moduleId,
  );
  const viewingRegion = getViewingRegion(await getUserLocations(user.userId));

  if (
    !targetModule ||
    !isModuleAvailable(targetModule.availability, viewingRegion)
  ) {
    redirect(`/${locale}`);
  }

  return user;
}
