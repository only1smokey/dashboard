import { z } from "zod";

import { routing } from "../../i18n/routing.ts";

const nullableText = z.string().trim().min(1).max(200).nullable();

export const locationOptionSchema = z.object({
  city: nullableText,
  continentCode: z.enum(["AF", "AN", "AS", "EU", "NA", "OC", "SA"]),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  countryName: z.string().trim().min(1).max(200),
  county: nullableText,
  district: nullableText,
  formattedAddress: z.string().trim().min(1).max(1000),
  houseNumber: nullableText,
  latitude: z.number().min(-90).max(90),
  level: z.enum(["address", "country"]),
  locality: nullableText,
  longitude: z.number().min(-180).max(180),
  name: z.string().trim().min(1).max(200),
  osmId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  osmType: z.enum(["N", "P", "R", "W"]),
  postcode: nullableText,
  state: nullableText,
  street: nullableText,
  type: z.string().trim().min(1).max(50),
});

export const locationChoiceSchema = z
  .object({
    address: locationOptionSchema.nullable(),
    country: locationOptionSchema,
  })
  .superRefine((choice, context) => {
    if (choice.country.level !== "country") {
      context.addIssue({ code: "custom", path: ["country"] });
    }
    if (
      choice.address &&
      (choice.address.level !== "address" ||
        choice.address.countryCode !== choice.country.countryCode)
    ) {
      context.addIssue({ code: "custom", path: ["address"] });
    }
  });

export const locationSettingsSchema = z
  .object({
    home: locationChoiceSchema.nullable(),
    viewing: locationChoiceSchema.nullable(),
    viewingMode: z.enum(["home", "separate"]),
  })
  .superRefine((settings, context) => {
    if (settings.viewingMode === "separate" && !settings.viewing) {
      context.addIssue({ code: "custom", path: ["viewing"] });
    }
  });

export const locationSearchSchema = z
  .object({
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .nullable(),
    language: z.enum(routing.locales),
    query: z.string().trim().min(2).max(200),
    type: z.enum(["address", "country"]),
  })
  .superRefine((search, context) => {
    if (search.type === "address" && !search.countryCode) {
      context.addIssue({ code: "custom", path: ["countryCode"] });
    }
  });

export type LocationSettingsValues = z.infer<typeof locationSettingsSchema>;
