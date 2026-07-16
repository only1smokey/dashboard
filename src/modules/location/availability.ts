import type { ContinentCode, ViewingRegion } from "./types.ts";

export type ModuleAvailability =
  | { scope: "global" }
  | {
      scope: "restricted";
      continents?: readonly ContinentCode[];
      countries?: readonly string[];
    };

export function isModuleAvailable(
  availability: ModuleAvailability,
  viewingRegion: ViewingRegion | null,
) {
  if (availability.scope === "global") return true;
  if (!viewingRegion) return false;

  return Boolean(
    availability.countries?.includes(viewingRegion.countryCode) ||
    availability.continents?.includes(viewingRegion.continentCode),
  );
}
