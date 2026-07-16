import type { LocationOption } from "@/modules/location/types";

export function getLocationOptionKey(location: LocationOption) {
  return `${location.osmType}-${location.osmId}`;
}

export function deduplicateLocationOptions(
  locations: readonly LocationOption[],
) {
  const seen = new Set<string>();

  return locations.filter((location) => {
    const key = getLocationOptionKey(location);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
