import "server-only";

import { redirect } from "next/navigation";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { hasActiveRole, type UserRole } from "@/modules/auth/authorization";
import { getLoginPath } from "@/modules/auth/routing";

export interface CurrentUserAccess {
  displayName: string | null;
  email: string | null;
  isActive: boolean;
  role: UserRole;
  userId: string;
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess | null> {
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
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (
    roleError ||
    !authorization ||
    !hasActiveRole({
      role: authorization.role,
      isActive: authorization.is_active,
    })
  ) {
    return null;
  }

  const emailClaim = claimsData.claims.email;

  return {
    displayName: profile?.display_name ?? null,
    email: typeof emailClaim === "string" ? emailClaim : null,
    isActive: authorization.is_active,
    role: authorization.role,
    userId,
  };
}

export async function requireActiveUser(locale: AppLocale) {
  const access = await getCurrentUserAccess();

  if (!access) {
    redirect(getLoginPath(locale));
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
