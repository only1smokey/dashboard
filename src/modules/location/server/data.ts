import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type {
  LocationKind,
  LocationOption,
  StoredLocation,
  ViewingRegion,
} from "@/modules/location/types";

export const getUserLocations = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_locations")
    .select("*")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map((location): StoredLocation => {
    const country: LocationOption = {
      city: null,
      continentCode: location.continent_code,
      countryCode: location.country_code,
      countryName: location.country_name,
      county: null,
      district: null,
      formattedAddress: location.country_name,
      houseNumber: null,
      latitude: location.country_latitude,
      level: "country",
      locality: null,
      longitude: location.country_longitude,
      name: location.country_name,
      osmId: location.country_osm_id,
      osmType: location.country_osm_type,
      postcode: null,
      state: null,
      street: null,
      type: "country",
    };
    const address: LocationOption | null = location.address_osm_id
      ? {
          city: location.address_city,
          continentCode: location.continent_code,
          countryCode: location.country_code,
          countryName: location.country_name,
          county: location.address_county,
          district: location.address_district,
          formattedAddress: location.address_formatted ?? location.country_name,
          houseNumber: location.address_house_number,
          latitude: location.address_latitude ?? location.country_latitude,
          level: "address",
          locality: location.address_locality,
          longitude: location.address_longitude ?? location.country_longitude,
          name:
            location.address_name ??
            location.address_formatted ??
            location.country_name,
          osmId: location.address_osm_id,
          osmType: location.address_osm_type ?? "N",
          postcode: location.address_postcode,
          state: location.address_state,
          street: location.address_street,
          type: location.address_type ?? "house",
        }
      : null;

    return {
      address,
      country,
      kind: location.kind as LocationKind,
    };
  });
});

export function getViewingRegion(
  locations: readonly StoredLocation[],
): ViewingRegion | null {
  const viewingLocation = locations.find(
    (location) => location.kind === "viewing",
  );

  return viewingLocation
    ? {
        continentCode: viewingLocation.country.continentCode,
        countryCode: viewingLocation.country.countryCode,
      }
    : null;
}
