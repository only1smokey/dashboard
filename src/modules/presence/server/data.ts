import "server-only";

import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUserAccess } from "@/modules/auth/server/access";
import { DIRECTORY_AVATAR_TTL_SECONDS } from "@/modules/presence/constants";
import { defaultPresencePreferences } from "@/modules/presence/presence";
import type {
  PeopleDirectoryEntry,
  PresenceBootstrap,
} from "@/modules/presence/types";

export async function getPresenceBootstrap(
  user: CurrentUserAccess,
  locale: AppLocale,
): Promise<PresenceBootstrap> {
  const supabase = await createClient();
  const [directoryResult, preferencesResult] = await Promise.all([
    supabase.rpc("get_people_directory"),
    supabase
      .from("user_presence")
      .select(
        "show_online, show_current_section, show_detailed_activity, show_media_titles",
      )
      .eq("user_id", user.userId)
      .maybeSingle(),
  ]);

  let directory: PeopleDirectoryEntry[];
  if (directoryResult.error || !directoryResult.data) {
    directory = [
      {
        avatarPath: user.avatarPath,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        lastSeenAt: null,
        userId: user.userId,
      },
    ];
  } else {
    directory = await Promise.all(
      directoryResult.data.map(
        async (person): Promise<PeopleDirectoryEntry> => {
          let avatarUrl: string | null = null;

          if (person.avatar_path) {
            const { data } = await supabase.storage
              .from("avatars")
              .createSignedUrl(
                person.avatar_path,
                DIRECTORY_AVATAR_TTL_SECONDS,
              );
            avatarUrl = data?.signedUrl ?? null;
          }

          return {
            avatarPath: person.avatar_path,
            avatarUrl,
            displayName: person.display_name,
            lastSeenAt: person.last_seen_at,
            userId: person.user_id,
          };
        },
      ),
    );
  }

  const preferences = preferencesResult.data
    ? {
        showCurrentSection: preferencesResult.data.show_current_section,
        showDetailedActivity: preferencesResult.data.show_detailed_activity,
        showMediaTitles: preferencesResult.data.show_media_titles,
        showOnline: preferencesResult.data.show_online,
      }
    : defaultPresencePreferences;

  return {
    directory,
    directoryAvailable: !directoryResult.error,
    locale,
    preferences,
    preferencesAvailable: !preferencesResult.error,
  };
}
