import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { hasActiveRole, type UserRole } from "@/modules/auth/authorization";
import { getDisabledAccountPath, getLoginPath } from "@/modules/auth/routing";

export interface CurrentUserAccess {
  avatarPath: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  preferredLocale: AppLocale;
  role: UserRole;
  userId: string;
}

export const getCurrentUserAccess = cache(
  async (): Promise<CurrentUserAccess | null> => {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims.sub;

    if (claimsError || !userId) {
      return null;
    }

    const [{ data: authorization, error: roleError }, { data: profile }] =
      await Promise.all([
        supabase
          .from("user_roles")
          .select("role, is_active")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("avatar_path, display_name, preferred_locale")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    if (roleError || !authorization) {
      return null;
    }

    const emailClaim = claimsData.claims.email;
    let avatarUrl: string | null = null;

    if (profile?.avatar_path && authorization.is_active) {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_path, 300);
      avatarUrl = data?.signedUrl ?? null;
    }

    return {
      avatarPath: profile?.avatar_path ?? null,
      avatarUrl,
      displayName: profile?.display_name ?? null,
      email: typeof emailClaim === "string" ? emailClaim : null,
      isActive: authorization.is_active,
      preferredLocale: profile?.preferred_locale ?? "de",
      role: authorization.role,
      userId,
    };
  },
);

export async function requireActiveUser(locale: AppLocale) {
  const access = await getCurrentUserAccess();

  if (!access) {
    redirect(getLoginPath(locale));
  }

  if (!access.isActive) {
    redirect(getDisabledAccountPath(locale));
  }

  return access;
}

export async function requireRole(locale: AppLocale, role: UserRole) {
  const access = await requireActiveUser(locale);

  if (!hasActiveRole(access, role)) {
    redirect(`/${locale}`);
  }

  return access;
}
