import assert from "node:assert/strict";
import test from "node:test";

import {
  PASSKEY_FRIENDLY_NAME_MAX_LENGTH,
  passkeyFriendlyNameSchema,
} from "./passkeys.ts";

test("validates and trims passkey friendly names at Supabase's limit", () => {
  assert.equal(
    passkeyFriendlyNameSchema.parse("  Family laptop  "),
    "Family laptop",
  );
  assert.equal(
    passkeyFriendlyNameSchema.safeParse(
      "a".repeat(PASSKEY_FRIENDLY_NAME_MAX_LENGTH),
    ).success,
    true,
  );
  assert.equal(passkeyFriendlyNameSchema.safeParse("   ").success, false);
  assert.equal(
    passkeyFriendlyNameSchema.safeParse(
      "a".repeat(PASSKEY_FRIENDLY_NAME_MAX_LENGTH + 1),
    ).success,
    false,
  );
});
