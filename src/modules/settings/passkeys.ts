import { z } from "zod";

export const PASSKEY_FRIENDLY_NAME_MAX_LENGTH = 120;

export const passkeyFriendlyNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(PASSKEY_FRIENDLY_NAME_MAX_LENGTH);

export interface PasskeySummary {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}
