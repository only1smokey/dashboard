import assert from "node:assert/strict";
import test from "node:test";

import { isModuleAvailable } from "./availability.ts";
import { getContinentCode } from "./continents.ts";
import { deduplicateLocationOptions, getLocationOptionKey } from "./options.ts";
import { locationSearchSchema, locationSettingsSchema } from "./schemas.ts";

const germany = {
  city: null,
  continentCode: "EU" as const,
  countryCode: "DE",
  countryName: "Germany",
  county: null,
  district: null,
  formattedAddress: "Germany",
  houseNumber: null,
  latitude: 51.1638175,
  level: "country" as const,
  locality: null,
  longitude: 10.4478313,
  name: "Germany",
  osmId: 51477,
  osmType: "R" as const,
  postcode: null,
  state: null,
  street: null,
  type: "country",
};

test("validates location searches and provider selections", () => {
  assert.equal(
    locationSearchSchema.safeParse({
      language: "de",
      query: "Boxberg",
      type: "country",
      countryCode: null,
    }).success,
    true,
  );
  assert.equal(
    locationSearchSchema.safeParse({
      language: "fr",
      query: "x",
      type: "address",
      countryCode: null,
    }).success,
    false,
  );
  assert.equal(
    locationSettingsSchema.safeParse({
      home: { address: null, country: germany },
      viewing: null,
      viewingMode: "home",
    }).success,
    true,
  );
  assert.equal(
    locationSettingsSchema.safeParse({
      home: { address: null, country: germany },
      viewing: null,
      viewingMode: "separate",
    }).success,
    false,
  );
  assert.equal(
    locationSettingsSchema.safeParse({
      home: null,
      viewing: null,
      viewingMode: "home",
    }).success,
    true,
  );
  assert.equal(
    locationSettingsSchema.safeParse({
      home: null,
      viewing: { address: null, country: germany },
      viewingMode: "separate",
    }).success,
    true,
  );
});

test("derives continent codes for country and timezone data", () => {
  assert.equal(getContinentCode("BG", "Europe/Sofia"), "EU");
  assert.equal(getContinentCode("DE", "Europe/Berlin"), "EU");
  assert.equal(getContinentCode("US", "Pacific/Honolulu"), "NA");
  assert.equal(getContinentCode("BR", "America/Sao_Paulo"), "SA");
  assert.equal(getContinentCode("JP", "Asia/Tokyo"), "AS");
  assert.equal(getContinentCode("ZZ", "Europe/Berlin"), "EU");
});

test("deduplicates Photon results by stable OSM identity", () => {
  const duplicate = { ...germany, name: "Deutschland" };
  const differentOsmType = { ...germany, osmType: "W" as const };
  const results = deduplicateLocationOptions([
    germany,
    duplicate,
    differentOsmType,
  ]);

  assert.equal(getLocationOptionKey(germany), "R-51477");
  assert.equal(results.length, 2);
  assert.equal(results[0], germany);
  assert.equal(results[1], differentOsmType);
});

test("matches global, country, and continent module availability", () => {
  const germanyRegion = { continentCode: "EU" as const, countryCode: "DE" };

  assert.equal(isModuleAvailable({ scope: "global" }, null), true);
  assert.equal(
    isModuleAvailable(
      { scope: "restricted", countries: ["DE"] },
      germanyRegion,
    ),
    true,
  );
  assert.equal(
    isModuleAvailable(
      { scope: "restricted", continents: ["EU"] },
      germanyRegion,
    ),
    true,
  );
  assert.equal(
    isModuleAvailable(
      { scope: "restricted", countries: ["BG"] },
      germanyRegion,
    ),
    false,
  );
  assert.equal(
    isModuleAvailable({ scope: "restricted", countries: ["DE"] }, null),
    false,
  );
});
