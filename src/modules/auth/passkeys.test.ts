import assert from "node:assert/strict";
import test from "node:test";

import {
  getPasskeyAvailability,
  isPasskeySupported,
  mapPasskeyError,
} from "./passkeys.ts";

test("maps official passkey and WebAuthn errors without exposing details", () => {
  assert.equal(mapPasskeyError({ code: "passkey_disabled" }), "disabled");
  assert.equal(
    mapPasskeyError({ code: "webauthn_credential_not_found" }),
    "credentialNotFound",
  );
  assert.equal(
    mapPasskeyError({ code: "webauthn_challenge_expired" }),
    "challengeExpired",
  );
  assert.equal(
    mapPasskeyError({ code: "webauthn_verification_failed" }),
    "verificationFailed",
  );
  assert.equal(
    mapPasskeyError({
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: { name: "NotAllowedError" },
    }),
    "cancelled",
  );
  assert.equal(mapPasskeyError({ name: "AuthRetryableFetchError" }), "network");
});

test("detects the browser capabilities required by the high-level API", () => {
  assert.equal(isPasskeySupported({}), false);
  assert.equal(
    getPasskeyAvailability({
      isSecureContext: false,
      PublicKeyCredential: function PublicKeyCredential() {},
      navigator: { credentials: {} },
    }),
    "insecure",
  );
  assert.equal(
    isPasskeySupported({
      isSecureContext: true,
      PublicKeyCredential: function PublicKeyCredential() {},
      navigator: { credentials: {} },
    }),
    true,
  );
});
