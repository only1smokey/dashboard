import assert from "node:assert/strict";
import test from "node:test";

import {
  getLocalizedRoute,
  getLoginPath,
  getSafeCallbackPath,
  isPublicAuthRoute,
} from "./routing.ts";

test("builds locale-aware login redirects for every supported locale", () => {
  assert.equal(getLoginPath("de"), "/de/login");
  assert.equal(getLoginPath("en"), "/en/login");
  assert.equal(getLoginPath("bg"), "/bg/login");
});

test("recognizes localized public auth routes without exposing app routes", () => {
  const login = getLocalizedRoute("/bg/login");
  const settings = getLocalizedRoute("/en/settings");

  assert.deepEqual(login, { locale: "bg", pathname: "/login" });
  assert.equal(isPublicAuthRoute(login?.pathname ?? ""), true);
  assert.deepEqual(settings, { locale: "en", pathname: "/settings" });
  assert.equal(isPublicAuthRoute(settings?.pathname ?? ""), false);
  assert.equal(getLocalizedRoute("/fr/login"), null);
});

test("allows only the localized reset page as a callback target", () => {
  assert.equal(
    getSafeCallbackPath("de", "/de/reset-password"),
    "/de/reset-password",
  );
  assert.equal(getSafeCallbackPath("de", "https://example.com"), "/de/login");
  assert.equal(getSafeCallbackPath("de", "/en/reset-password"), "/de/login");
});
