import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/config/env";

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();

  return createBrowserClient(url, publishableKey);
}
