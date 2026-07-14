import assert from "node:assert/strict";
import test from "node:test";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./schemas.ts";

test("accepts valid localized login and reset inputs", () => {
  assert.equal(
    loginSchema.safeParse({
      email: "family@example.com",
      password: "password",
      locale: "bg",
    }).success,
    true,
  );
  assert.equal(
    forgotPasswordSchema.safeParse({
      email: "family@example.com",
      locale: "de",
    }).success,
    true,
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      password: "new-password",
      confirmPassword: "new-password",
      locale: "en",
    }).success,
    true,
  );
});

test("rejects unsupported locales and mismatched or short passwords", () => {
  assert.equal(
    loginSchema.safeParse({
      email: "family@example.com",
      password: "password",
      locale: "fr",
    }).success,
    false,
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      password: "short",
      confirmPassword: "different",
      locale: "de",
    }).success,
    false,
  );
});
