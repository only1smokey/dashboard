import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import type { UserRole } from "@/modules/auth/authorization";
import { requireRole } from "@/modules/auth/server/access";

export interface AdminUser {
  avatarUrl: string | null;
  createdAt: string;
  displayName: string | null;
  id: string;
  isActive: boolean;
  preferredLocale: AppLocale;
  role: UserRole;
}

export async function getAdminUsers(locale: AppLocale) {
  const currentUser = await requireRole(locale, "admin");
  const supabase = await createClient();
  const [
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_path, preferred_locale, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("user_roles").select("user_id, role, is_active"),
  ]);

  if (profilesError || rolesError) throw profilesError ?? rolesError;

  const rolesById = new Map((roles ?? []).map((role) => [role.user_id, role]));
  const users = await Promise.all(
    (profiles ?? []).map(async (profile): Promise<AdminUser | null> => {
      const authorization = rolesById.get(profile.id);
      if (!authorization) return null;

      let avatarUrl: string | null = null;
      if (profile.avatar_path) {
        const { data } = await supabase.storage
          .from("avatars")
          .createSignedUrl(profile.avatar_path, 300);
        avatarUrl = data?.signedUrl ?? null;
      }

      return {
        avatarUrl,
        createdAt: profile.created_at,
        displayName: profile.display_name,
        id: profile.id,
        isActive: authorization.is_active,
        preferredLocale: profile.preferred_locale,
        role: authorization.role,
      };
    }),
  );

  return {
    currentUserId: currentUser.userId,
    users: users.filter((user): user is AdminUser => user !== null),
  };
}
