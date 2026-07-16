import { z } from "zod";

export const presencePreferencesSchema = z.object({
  showCurrentSection: z.boolean(),
  showDetailedActivity: z.boolean(),
  showMediaTitles: z.boolean(),
  showOnline: z.boolean(),
});

export type PresencePreferencesValues = z.infer<
  typeof presencePreferencesSchema
>;
