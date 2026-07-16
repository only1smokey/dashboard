import "server-only";

import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { getContinentCode } from "@/modules/location/continents";
import { deduplicateLocationOptions } from "@/modules/location/options";
import type { LocationOption } from "@/modules/location/types";

const photonEndpoint = "https://photon.komoot.io/api/";
const photonLanguage: Record<AppLocale, "de" | "en"> = {
  bg: "en",
  de: "de",
  en: "en",
};

const photonPropertiesSchema = z.object({
  city: z.string().optional(),
  country: z.string().min(1).max(200),
  countrycode: z.string().length(2),
  county: z.string().optional(),
  district: z.string().optional(),
  housenumber: z.string().optional(),
  locality: z.string().optional(),
  name: z.string().optional(),
  osm_id: z.number().int().positive(),
  osm_type: z.enum(["N", "P", "R", "W"]),
  postcode: z.string().optional(),
  state: z.string().optional(),
  street: z.string().optional(),
  type: z.string().min(1).max(50),
});

const photonFeatureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
    type: z.literal("Point"),
  }),
  properties: photonPropertiesSchema,
  type: z.literal("Feature"),
});

const photonResponseSchema = z.object({
  features: z.array(photonFeatureSchema),
  type: z.literal("FeatureCollection"),
});

function cleanPart(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 200) : null;
}

function uniqueParts(parts: Array<string | null>) {
  return parts.filter(
    (part, index): part is string =>
      Boolean(part) &&
      parts.findIndex((candidate) => candidate === part) === index,
  );
}

function normalizeLocation(
  feature: z.infer<typeof photonFeatureSchema>,
): LocationOption | null {
  const properties = feature.properties;
  const countryCode = properties.countrycode.toUpperCase();
  const continentCode = getContinentCode(countryCode, "");
  if (!continentCode) return null;

  const countryName = properties.country.trim().slice(0, 200);
  const street = cleanPart(properties.street);
  const houseNumber = cleanPart(properties.housenumber);
  const city = cleanPart(properties.city);
  const locality = cleanPart(properties.locality);
  const district = cleanPart(properties.district);
  const county = cleanPart(properties.county);
  const state = cleanPart(properties.state);
  const postcode = cleanPart(properties.postcode);
  const streetLine = [street, houseNumber].filter(Boolean).join(" ") || null;
  const postcodeCity = [postcode, city].filter(Boolean).join(" ") || null;
  const suppliedName = cleanPart(properties.name);
  const isCountry = properties.type === "country";
  const name =
    (isCountry ? countryName : suppliedName) ??
    streetLine ??
    city ??
    locality ??
    district ??
    state ??
    countryName;
  const addressParts = isCountry
    ? [countryName]
    : uniqueParts([
        suppliedName && suppliedName !== streetLine ? suppliedName : null,
        streetLine,
        postcodeCity,
        !postcode ? city : null,
        !city ? (locality ?? district) : null,
        state,
        countryName,
      ]);

  return {
    city,
    continentCode,
    countryCode,
    countryName,
    county,
    district,
    formattedAddress: addressParts.join(", ").slice(0, 1000),
    houseNumber,
    latitude: feature.geometry.coordinates[1],
    level: isCountry ? "country" : "address",
    locality,
    longitude: feature.geometry.coordinates[0],
    name,
    osmId: properties.osm_id,
    osmType: properties.osm_type,
    postcode,
    state,
    street,
    type: properties.type,
  };
}

export async function searchLocations(
  query: string,
  language: AppLocale,
  type: "address" | "country",
  countryCode: string | null,
) {
  const url = new URL(photonEndpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", photonLanguage[language]);

  if (type === "country") {
    url.searchParams.append("layer", "country");
  } else {
    if (!countryCode) return [];
    url.searchParams.set("countrycode", countryCode);
    for (const layer of [
      "house",
      "street",
      "locality",
      "district",
      "city",
      "county",
      "state",
    ]) {
      url.searchParams.append("layer", layer);
    }
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "FamilyDashboard/0.1 (private household app)" },
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new Error("photon_request_failed");

  const parsed = photonResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("photon_response_invalid");

  return deduplicateLocationOptions(
    parsed.data.features
      .map(normalizeLocation)
      .filter((location): location is LocationOption => location !== null)
      .filter((location) =>
        type === "country"
          ? location.level === "country"
          : location.level === "address" &&
            location.countryCode === countryCode,
      ),
  );
}
