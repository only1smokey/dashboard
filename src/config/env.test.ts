import assert from "node:assert/strict";
import test from "node:test";

import {
  AppUrlConfigurationError,
  getAppUrl,
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "./env.ts";

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

test("validates the canonical application HTTPS origin", () => {
  assert.equal(
    getAppUrl("https://dashboard.example.local/"),
    "https://dashboard.example.local",
  );
  assert.equal(getAppUrl(""), null);
  assert.throws(
    () => getAppUrl("http://dashboard.example.local"),
    AppUrlConfigurationError,
  );
  assert.throws(
    () => getAppUrl("https://dashboard.example.local/path"),
    AppUrlConfigurationError,
  );
});
