"use server";

import { revalidatePath } from "next/cache";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/modules/auth/server/access";
import { presencePreferencesSchema } from "@/modules/presence/schemas";

export type PresencePreferencesActionResult =
  | { status: "success" }
  | { status: "error"; error: "invalidFields" | "saveFailed" };

export async function updatePresencePreferencesAction(
  input: unknown,
  locale: AppLocale,
): Promise<PresencePreferencesActionResult> {
  const parsed = presencePreferencesSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidFields" };

  await requireActiveUser(locale);
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_presence_preferences", {
    p_show_current_section: parsed.data.showCurrentSection,
    p_show_detailed_activity: parsed.data.showDetailedActivity,
    p_show_media_titles: parsed.data.showMediaTitles,
    p_show_online: parsed.data.showOnline,
  });

  if (error) return { status: "error", error: "saveFailed" };

  revalidatePath("/[locale]", "layout");
  return { status: "success" };
}
