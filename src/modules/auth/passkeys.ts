export type PasskeyErrorKind =
  | "cancelled"
  | "insecure"
  | "unsupported"
  | "disabled"
  | "credentialNotFound"
  | "challengeExpired"
  | "verificationFailed"
  | "network"
  | "tooMany"
  | "alreadyRegistered"
  | "unknown";

interface ErrorLike {
  cause?: unknown;
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
}

function asErrorLike(value: unknown): ErrorLike | null {
  return typeof value === "object" && value !== null
    ? (value as ErrorLike)
    : null;
}

function hasErrorName(value: unknown, name: string) {
  return asErrorLike(value)?.name === name;
}

export function mapPasskeyError(error: unknown): PasskeyErrorKind {
  const detail = asErrorLike(error);
  const code = typeof detail?.code === "string" ? detail.code : undefined;

  if (
    code === "ERROR_CEREMONY_ABORTED" ||
    hasErrorName(detail?.cause, "AbortError") ||
    hasErrorName(detail?.cause, "NotAllowedError")
  ) {
    return "cancelled";
  }

  if (
    detail?.name === "NotSupportedError" ||
    detail?.message === "Browser does not support WebAuthn"
  ) {
    return "unsupported";
  }

  switch (code) {
    case "passkey_disabled":
      return "disabled";
    case "webauthn_credential_not_found":
      return "credentialNotFound";
    case "webauthn_challenge_not_found":
    case "webauthn_challenge_expired":
      return "challengeExpired";
    case "webauthn_verification_failed":
      return "verificationFailed";
    case "too_many_passkeys":
      return "tooMany";
    case "webauthn_credential_exists":
      return "alreadyRegistered";
  }

  if (
    detail?.name === "AuthRetryableFetchError" ||
    (typeof detail?.status === "number" && detail.status >= 500)
  ) {
    return "network";
  }

  return "unknown";
}

interface WebAuthnEnvironment {
  isSecureContext?: boolean;
  PublicKeyCredential?: unknown;
  navigator?: { credentials?: unknown };
}

export type PasskeyAvailability = "available" | "insecure" | "unsupported";

export function getPasskeyAvailability(
  environment: WebAuthnEnvironment = globalThis,
): PasskeyAvailability {
  if (environment.isSecureContext === false) {
    return "insecure";
  }

  return typeof environment.PublicKeyCredential === "function" &&
    typeof environment.navigator?.credentials === "object" &&
    environment.navigator.credentials !== null
    ? "available"
    : "unsupported";
}

export function isPasskeySupported(
  environment: WebAuthnEnvironment = globalThis,
) {
  return getPasskeyAvailability(environment) === "available";
}
