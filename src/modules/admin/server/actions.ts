"use server";

import { revalidatePath } from "next/cache";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  adminRoleUpdateSchema,
  adminStatusUpdateSchema,
} from "@/modules/admin/schemas";
import { requireRole } from "@/modules/auth/server/access";

export type AdminActionError =
  | "invalidRequest"
  | "notAuthorized"
  | "targetNotFound"
  | "cannotDeactivateSelf"
  | "lastActiveAdmin"
  | "updateFailed";

export type AdminActionResult =
  { status: "success" } | { status: "error"; error: AdminActionError };

function mapDatabaseError(message: string): AdminActionError {
  if (message.includes("not_authorized")) return "notAuthorized";
  if (message.includes("target_not_found")) return "targetNotFound";
  if (message.includes("cannot_deactivate_self")) {
    return "cannotDeactivateSelf";
  }
  if (message.includes("last_active_admin")) return "lastActiveAdmin";
  if (message.includes("invalid_")) return "invalidRequest";
  return "updateFailed";
}

export async function updateUserRoleAction(
  input: unknown,
  locale: AppLocale,
): Promise<AdminActionResult> {
  const parsed = adminRoleUpdateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidRequest" };

  await requireRole(locale, "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_target_user_id: parsed.data.targetUserId,
    p_role: parsed.data.role,
  });

  if (error) return { status: "error", error: mapDatabaseError(error.message) };
  revalidatePath("/[locale]/admin/users", "page");
  return { status: "success" };
}

export async function updateUserStatusAction(
  input: unknown,
  locale: AppLocale,
): Promise<AdminActionResult> {
  const parsed = adminStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidRequest" };

  await requireRole(locale, "admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_active", {
    p_target_user_id: parsed.data.targetUserId,
    p_is_active: parsed.data.isActive,
  });

  if (error) return { status: "error", error: mapDatabaseError(error.message) };
  revalidatePath("/[locale]/admin/users", "page");
  return { status: "success" };
}
