import assert from "node:assert/strict";
import test from "node:test";

import { avatarPathSchema, profileSchema } from "./schemas.ts";

test("accepts only editable profile fields with supported locales", () => {
  assert.equal(
    profileSchema.safeParse({
      displayName: "Family Member",
      preferredLocale: "bg",
    }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ displayName: "", preferredLocale: "fr" }).success,
    false,
  );
});

test("accepts predictable avatar paths and rejects other folders or formats", () => {
  assert.equal(
    avatarPathSchema.safeParse(
      "98fae6b1-e45a-4d6c-b030-6fd8e5bcb991/avatar.webp",
    ).success,
    true,
  );
  assert.equal(
    avatarPathSchema.safeParse(
      "98fae6b1-e45a-4d6c-b030-6fd8e5bcb991/nested/avatar.svg",
    ).success,
    false,
  );
});
