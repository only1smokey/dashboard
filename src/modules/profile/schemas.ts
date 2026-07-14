import { z } from "zod";

import { routing } from "../../i18n/routing.ts";

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  preferredLocale: z.enum(routing.locales),
});

export const avatarPathSchema = z
  .string()
  .max(1024)
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/avatar\.(?:jpg|jpeg|png|webp|gif)$/i,
  );

export type ProfileValues = z.infer<typeof profileSchema>;
