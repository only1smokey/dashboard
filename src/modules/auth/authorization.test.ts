import assert from "node:assert/strict";
import test from "node:test";

import { hasActiveRole } from "./authorization.ts";

test("fails closed for missing and inactive authorization records", () => {
  assert.equal(hasActiveRole(null), false);
  assert.equal(hasActiveRole({ role: "admin", isActive: false }), false);
});

test("requires the requested active role", () => {
  assert.equal(hasActiveRole({ role: "user", isActive: true }), true);
  assert.equal(hasActiveRole({ role: "user", isActive: true }, "admin"), false);
  assert.equal(hasActiveRole({ role: "admin", isActive: true }, "admin"), true);
});
