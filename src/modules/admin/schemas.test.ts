import assert from "node:assert/strict";
import test from "node:test";

import { adminRoleUpdateSchema, adminStatusUpdateSchema } from "./schemas.ts";

const userId = "98fae6b1-e45a-4d6c-b030-6fd8e5bcb991";

test("validates administrator role and status update inputs", () => {
  assert.equal(
    adminRoleUpdateSchema.safeParse({ targetUserId: userId, role: "admin" })
      .success,
    true,
  );
  assert.equal(
    adminStatusUpdateSchema.safeParse({
      targetUserId: userId,
      isActive: false,
    }).success,
    true,
  );
});

test("rejects invalid targets, roles, and browser-provided admin flags", () => {
  assert.equal(
    adminRoleUpdateSchema.safeParse({
      targetUserId: "not-a-uuid",
      role: "owner",
      isAdmin: true,
    }).success,
    false,
  );
  assert.equal(
    adminStatusUpdateSchema.safeParse({ targetUserId: userId }).success,
    false,
  );
});
