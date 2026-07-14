#!/bin/sh
set -eu

fail() {
  printf 'Caddy startup configuration error: %s\n' "$1" >&2
  exit 1
}

[ -n "${APP_DOMAIN:-}" ] || fail "APP_DOMAIN is required"

case "$APP_DOMAIN" in
  *[!A-Za-z0-9.-]* | .* | *..* | -* | *- | *.)
    fail "APP_DOMAIN must be a hostname without a scheme, port, path, or wildcard"
    ;;
esac

[ "${APP_URL:-}" = "https://${APP_DOMAIN}" ] ||
  fail "APP_URL must exactly equal https://${APP_DOMAIN}"

case "${CADDY_TLS_MODE:-}" in
  internal)
    printf 'tls internal\n' > /config/tls-mode.caddy
    ;;
  public)
    printf '# Public automatic HTTPS uses Caddy defaults.\n' > /config/tls-mode.caddy
    ;;
  *)
    fail "CADDY_TLS_MODE must be either internal or public"
    ;;
esac

if [ -n "${ACME_EMAIL:-}" ]; then
  printf '%s\n' "$ACME_EMAIL" |
    grep -Eq '^[A-Za-z0-9.!#$%&*+/=?^_{}|~+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9-]+$' ||
    fail "ACME_EMAIL is not a valid email address"
  printf 'email %s\n' "$ACME_EMAIL" > /config/acme-email.caddy
else
  printf '# No ACME account email configured.\n' > /config/acme-email.caddy
fi

exec "$@"
