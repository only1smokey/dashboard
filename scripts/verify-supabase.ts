import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "../src/config/env.ts";

const { url, publishableKey } = getSupabaseConfig();
const supabase = createClient(url, publishableKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

assert.ok(supabase.auth, "Supabase Auth client was not initialized");
console.log("Supabase client initialization succeeded.");
