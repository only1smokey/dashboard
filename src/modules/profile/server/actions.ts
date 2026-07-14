"use server";

import { revalidatePath } from "next/cache";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/modules/auth/server/access";
import { avatarPathSchema, profileSchema } from "@/modules/profile/schemas";

export type ProfileActionError =
  "invalidFields" | "saveFailed" | "avatarFailed";

export type ProfileActionResult =
  { status: "success" } | { status: "error"; error: ProfileActionError };

function refreshProfilePages() {
  revalidatePath("/[locale]/profile", "page");
  revalidatePath("/[locale]", "layout");
}

export async function updateProfileAction(
  input: unknown,
  locale: AppLocale,
): Promise<ProfileActionResult> {
  const parsed = profileSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", error: "invalidFields" };
  }

  const user = await requireActiveUser(locale);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      preferred_locale: parsed.data.preferredLocale,
    })
    .eq("id", user.userId);

  if (error) {
    return { status: "error", error: "saveFailed" };
  }

  refreshProfilePages();
  return { status: "success" };
}

export async function confirmAvatarAction(
  pathInput: unknown,
  locale: AppLocale,
): Promise<ProfileActionResult> {
  const parsed = avatarPathSchema.safeParse(pathInput);

  if (!parsed.success) {
    return { status: "error", error: "avatarFailed" };
  }

  const user = await requireActiveUser(locale);

  if (!parsed.data.startsWith(`${user.userId}/`)) {
    return { status: "error", error: "avatarFailed" };
  }

  const supabase = await createClient();
  const { data: oldPath, error } = await supabase.rpc("set_own_avatar_path", {
    p_avatar_path: parsed.data,
  });

  if (error) {
    return { status: "error", error: "avatarFailed" };
  }

  if (oldPath && oldPath !== parsed.data) {
    const { error: cleanupError } = await supabase.storage
      .from("avatars")
      .remove([oldPath]);

    if (cleanupError) {
      await supabase.rpc("set_own_avatar_path", {
        p_avatar_path: oldPath,
      });
      await supabase.storage.from("avatars").remove([parsed.data]);
      return { status: "error", error: "avatarFailed" };
    }
  }

  refreshProfilePages();
  return { status: "success" };
}

export async function removeAvatarAction(
  locale: AppLocale,
): Promise<ProfileActionResult> {
  await requireActiveUser(locale);
  const supabase = await createClient();
  const { data: oldPath, error } = await supabase.rpc("set_own_avatar_path", {
    p_avatar_path: null,
  });

  if (error) {
    return { status: "error", error: "avatarFailed" };
  }

  if (oldPath) {
    const { error: cleanupError } = await supabase.storage
      .from("avatars")
      .remove([oldPath]);

    if (cleanupError) {
      await supabase.rpc("set_own_avatar_path", {
        p_avatar_path: oldPath,
      });
      return { status: "error", error: "avatarFailed" };
    }
  }

  refreshProfilePages();
  return { status: "success" };
}
