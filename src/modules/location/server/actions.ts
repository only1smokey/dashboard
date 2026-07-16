"use server";

import { revalidatePath } from "next/cache";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/modules/auth/server/access";
import { getContinentCode } from "@/modules/location/continents";
import { locationSettingsSchema } from "@/modules/location/schemas";
import type { LocationChoice, LocationKind } from "@/modules/location/types";

export type LocationActionError =
  "invalidFields" | "invalidLocation" | "saveFailed";

export type LocationActionResult =
  { status: "success" } | { status: "error"; error: LocationActionError };

function toLocationRow(
  choice: LocationChoice,
  kind: LocationKind,
  userId: string,
) {
  const continentCode = getContinentCode(choice.country.countryCode, "");
  if (!continentCode) return null;

  const address = choice.address;
  return {
    address_city: address?.city ?? null,
    address_county: address?.county ?? null,
    address_district: address?.district ?? null,
    address_formatted: address?.formattedAddress ?? null,
    address_house_number: address?.houseNumber ?? null,
    address_latitude: address?.latitude ?? null,
    address_locality: address?.locality ?? null,
    address_longitude: address?.longitude ?? null,
    address_name: address?.name ?? null,
    address_osm_id: address?.osmId ?? null,
    address_osm_type: address?.osmType ?? null,
    address_postcode: address?.postcode ?? null,
    address_state: address?.state ?? null,
    address_street: address?.street ?? null,
    address_type: address?.type ?? null,
    continent_code: continentCode,
    country_code: choice.country.countryCode,
    country_latitude: choice.country.latitude,
    country_longitude: choice.country.longitude,
    country_name: choice.country.countryName,
    country_osm_id: choice.country.osmId,
    country_osm_type: choice.country.osmType,
    kind,
    provider: "photon" as const,
    user_id: userId,
  };
}

export async function updateLocationsAction(
  input: unknown,
  locale: AppLocale,
): Promise<LocationActionResult> {
  const parsed = locationSettingsSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidFields" };

  const user = await requireActiveUser(locale);
  const viewingChoice =
    parsed.data.viewingMode === "home" ? parsed.data.home : parsed.data.viewing;
  const requestedLocations: Array<{
    choice: LocationChoice | null;
    kind: LocationKind;
  }> = [
    { choice: parsed.data.home, kind: "home" },
    { choice: viewingChoice, kind: "viewing" },
  ];
  const rows: NonNullable<ReturnType<typeof toLocationRow>>[] = [];

  for (const location of requestedLocations) {
    if (!location.choice) continue;
    const row = toLocationRow(location.choice, location.kind, user.userId);
    if (!row) return { status: "error", error: "invalidLocation" };
    rows.push(row);
  }

  const supabase = await createClient();
  if (rows.length > 0) {
    const { error } = await supabase
      .from("user_locations")
      .upsert(rows, { onConflict: "user_id,kind" });

    if (error) return { status: "error", error: "saveFailed" };
  }

  const storedKinds = new Set(rows.map((row) => row.kind));
  const removedKinds = (["home", "viewing"] as const).filter(
    (kind) => !storedKinds.has(kind),
  );

  if (removedKinds.length > 0) {
    const { error } = await supabase
      .from("user_locations")
      .delete()
      .eq("user_id", user.userId)
      .in("kind", removedKinds);

    if (error) return { status: "error", error: "saveFailed" };
  }

  revalidatePath("/[locale]/settings", "page");
  revalidatePath("/[locale]", "layout");
  return { status: "success" };
}
