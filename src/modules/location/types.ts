export const locationKinds = ["home", "viewing"] as const;

export type LocationKind = (typeof locationKinds)[number];
export type ContinentCode = "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
export type PhotonOsmType = "N" | "P" | "R" | "W";
export type LocationLevel = "address" | "country";

export interface LocationOption {
  city: string | null;
  continentCode: ContinentCode;
  countryCode: string;
  countryName: string;
  county: string | null;
  district: string | null;
  formattedAddress: string;
  houseNumber: string | null;
  latitude: number;
  level: LocationLevel;
  locality: string | null;
  longitude: number;
  name: string;
  osmId: number;
  osmType: PhotonOsmType;
  postcode: string | null;
  state: string | null;
  street: string | null;
  type: string;
}

export interface LocationChoice {
  address: LocationOption | null;
  country: LocationOption;
}

export interface StoredLocation extends LocationChoice {
  kind: LocationKind;
}

export interface ViewingRegion {
  continentCode: ContinentCode;
  countryCode: string;
}
