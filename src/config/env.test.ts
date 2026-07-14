import assert from "node:assert/strict";
import test from "node:test";

import { getSupabaseConfig, SupabaseConfigurationError } from "./env.ts";

const validConfig = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example-key",
};

test("validates and maps public Supabase configuration", () => {
  assert.deepEqual(getSupabaseConfig(validConfig), {
    url: validConfig.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: validConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
});

test("rejects missing configuration without including values", () => {
  assert.throws(
    () => getSupabaseConfig({}),
    (error: unknown) => {
      assert.ok(error instanceof SupabaseConfigurationError);
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
      return true;
    },
  );
});

test("rejects non-HTTPS URLs and non-publishable keys", () => {
  assert.throws(
    () =>
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "not-a-publishable-key",
      }),
    SupabaseConfigurationError,
  );
});
