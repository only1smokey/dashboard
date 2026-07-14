# Production deployment with Caddy

## Architecture

Production traffic follows one path:

```text
family client
  -> Caddy container (host TCP 80, TCP 443, UDP 443)
  -> dashboard container (private Docker network, internal TCP 3000)
```

Caddy terminates HTTPS and proxies to `dashboard:3000`, the actual Compose service name. The application has only Compose `expose` metadata and no host `ports` mapping. Caddy and the dashboard share the `dashboard_private` bridge; no database, local Supabase, Certbot, certificate renewal script, source-code volume, or second authentication layer is present.

Caddy is a separate container because its network edge, lifecycle, and persistent certificate state are different from the prebuilt standalone Next.js application. The application can restart while Caddy stays up, and Caddy can reload configuration without rebuilding Next.js. The Pine64 never builds the application.

The Compose service uses the official multi-architecture `caddy:2.11.4-alpine` image, `restart: unless-stopped`, `no-new-privileges`, and only `NET_BIND_SERVICE` after dropping all other Linux capabilities. `NET_ADMIN` is intentionally absent; it is optional UDP buffer tuning, not a requirement for HTTP/3.

## Deployment environment

Copy `.env.example` to `.env` beside `compose.yaml`. `.env` is ignored by Git. The deployment variables are:

- `DASHBOARD_IMAGE`: prebuilt GitHub Container Registry image to pull.
- `APP_DOMAIN`: hostname only, with no scheme, port, path, or wildcard.
- `APP_URL`: exact canonical origin; it must equal `https://${APP_DOMAIN}`.
- `CADDY_TLS_MODE`: exactly `internal` or `public`.
- `ACME_EMAIL`: optional ACME account email, normally set for public mode.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public Supabase configuration embedded when the application image is built. Runtime values do not replace the build-time values.

Internal/private example:

```env
DASHBOARD_IMAGE=ghcr.io/OWNER/REPOSITORY:latest
APP_DOMAIN=dashboard.example.local
APP_URL=https://dashboard.example.local
CADDY_TLS_MODE=internal
ACME_EMAIL=
```

Public example:

```env
DASHBOARD_IMAGE=ghcr.io/OWNER/REPOSITORY:latest
APP_DOMAIN=dashboard.example.com
APP_URL=https://dashboard.example.com
CADDY_TLS_MODE=public
ACME_EMAIL=admin@example.com
```

The Caddy startup script rejects unsupported TLS modes and inconsistent domain/URL values before Caddy starts. In production, Next.js uses `APP_URL` as the canonical password-reset and authentication callback origin instead of trusting request-supplied forwarding headers. Caddy overwrites incoming `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` values with the real proxy context. Application authorization still comes from the verified Supabase session and database roles, never from proxy headers.

## Internal TLS mode

With `CADDY_TLS_MODE=internal`, the generated fragment is exactly `tls internal`. Caddy manages the local root, intermediate, leaf certificates, and renewals. Caddy running in Docker cannot install its root on family devices. Each Windows, Android, and iPhone/iPad client must explicitly trust the public root certificate before the HTTPS site has a normal trusted production-style origin.

Start Caddy once so the CA exists, then locate and export only its public root certificate:

```bash
docker compose exec caddy ls -l /data/caddy/pki/authorities/local/root.crt
mkdir -p caddy-root-ca
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root-ca/root.crt
```

The exported `root.crt` is public. Never copy, expose, or distribute `/data/caddy/pki/authorities/local/root.key` or any other private key.

Install `root.crt` only on trusted family devices:

- Windows: open PowerShell as the target user and run `Import-Certificate -FilePath .\caddy-root-ca\root.crt -CertStoreLocation Cert:\CurrentUser\Root`, or use the Certificate Import Wizard and select **Trusted Root Certification Authorities**. Browsers with a separate trust store may also require an explicit Authorities import.
- Android: transfer only `root.crt`, then use **Settings > Security & privacy > More security settings > Install a certificate > CA certificate** (wording varies by vendor). Confirm the device security warning. Caddy cannot perform this step remotely.
- iPhone/iPad: transfer only `root.crt`, install the downloaded profile in **Settings > General > VPN & Device Management**, then explicitly enable it under **Settings > General > About > Certificate Trust Settings > Enable Full Trust for Root Certificates**. Caddy cannot perform these steps remotely.

Internal DNS must resolve `APP_DOMAIN` to the Pine64 for every client. A private-only hostname such as `dashboard.fritz.box` is appropriate only for internal TLS; it does not qualify for a normal publicly trusted ACME certificate. Do not claim a client trusts the CA until installation and browser verification have actually succeeded on that device.

## Public automatic HTTPS mode

With `CADDY_TLS_MODE=public`, no `tls` override is rendered. The hostname site address activates Caddy automatic HTTPS: Caddy obtains a public certificate, stores it, renews it automatically, and redirects HTTP to HTTPS. If `ACME_EMAIL` is non-empty it is rendered as Caddy's global ACME account email. There is no Certbot, cron job, custom renewal logic, manually configured certificate path, DNS provider plugin, wildcard, or Cloudflare-specific behavior.

Public issuance requires a real qualifying DNS name whose A/AAAA records resolve to the deployment, plus suitable ACME validation reachability. Normally TCP ports 80 and 443 must reach Caddy through the router/firewall; UDP 443 enables HTTP/3 but is not an ACME requirement. Private-only names, including `dashboard.fritz.box`, cannot receive ordinary publicly trusted ACME certificates. Inspect Caddy logs for the issuer result; do not assume issuance succeeded merely because the container started.

## Persistent certificate state

Compose creates `caddy_data` at `/data` and `caddy_config` at `/config`. The data volume holds certificates, private keys, OCSP state, the internal CA, and other necessary Caddy state. It survives container replacement and image upgrades.

Never treat `caddy_data` as cache, never include it in routine cleanup, and never run `docker compose down -v` for this deployment unless deliberately destroying its certificate identity after a reviewed backup/migration plan. Normal `docker compose down`, `docker compose pull`, and `docker compose up -d` preserve named volumes.

Confirm the mount and recreation behavior without deleting volumes:

```bash
docker compose exec caddy sh -c 'test -d /data/caddy && ls -ld /data/caddy'
docker compose down
docker compose up -d
docker compose exec caddy sh -c 'test -d /data/caddy && ls -ld /data/caddy'
```

For internal mode, compare the public root certificate fingerprint before and after recreation:

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root-ca/root-after-recreate.crt
openssl x509 -in ./caddy-root-ca/root.crt -noout -fingerprint -sha256
openssl x509 -in ./caddy-root-ca/root-after-recreate.crt -noout -fingerprint -sha256
```

The two fingerprints must match.

## Supabase and Passkey hostname settings

Docker environment variables cannot update a hosted Supabase project's Dashboard. Whenever `APP_DOMAIN` or `APP_URL` changes, manually update the matching Supabase project:

1. **Authentication > URL Configuration > Site URL**: exact `APP_URL`, for example `https://dashboard.example.com`.
2. **Authentication > URL Configuration > Redirect URLs**: exact `${APP_URL}/de/auth/callback`, `${APP_URL}/en/auth/callback`, and `${APP_URL}/bg/auth/callback`.
3. Keep the local development callbacks only if local development is still used: `http://localhost:3000/de/auth/callback`, `http://localhost:3000/en/auth/callback`, and `http://localhost:3000/bg/auth/callback`.
4. **Authentication > Passkeys > Relying Party ID**: exact `APP_DOMAIN`, for example `dashboard.example.com`; no scheme, port, or path.
5. **Authentication > Passkeys > Relying Party Origins/allowed origin**: exact `APP_URL`, for example `https://dashboard.example.com`.

Do not attempt to change these hosted settings from application code. WebAuthn binds credentials to the Relying Party ID. Changing it can make every previously registered Passkey for the old ID unusable, requiring family members to enroll again. For internal TLS, install and verify the Caddy root CA on the browser/device before treating the origin as a trusted production-style WebAuthn origin.

## Local Docker verification

Local application development remains unchanged:

```bash
pnpm dev
```

For the production-style internal-TLS stack, prepare `.env`, build the same standalone application image locally, validate Compose and Caddy, and start both services:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -t family-dashboard:local .
docker compose config
docker compose pull caddy
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
DASHBOARD_IMAGE=family-dashboard:local docker compose up -d
docker compose ps
```

On PowerShell, set `$env:DASHBOARD_IMAGE='family-dashboard:local'` before `docker compose up -d`, and pass `$env:NEXT_PUBLIC_SUPABASE_URL` and `$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the corresponding build arguments.

Ensure the test hostname resolves to the Docker host, then verify routing. `--resolve` affects curl only and `--cacert` trusts only the exported public CA for this test:

```bash
curl --resolve "${APP_DOMAIN}:80:127.0.0.1" -I "http://${APP_DOMAIN}/api/health"
curl --resolve "${APP_DOMAIN}:443:127.0.0.1" --cacert ./caddy-root-ca/root.crt "https://${APP_DOMAIN}/api/health"
```

The first response must redirect to the same hostname over HTTPS; the second must return JSON with `"status":"ok"`. Also confirm `docker compose port dashboard 3000` returns no published binding and `docker compose exec caddy wget -qO- http://dashboard:3000/api/health` reaches the service by Docker DNS. Authentication verification requires the real Supabase project: test localized login redirects, password-reset email callbacks, Passkey sign-in/registration, inactive-account blocking, and rejection of cross-origin `next` targets through the HTTPS hostname.

Stop the local stack without deleting volumes:

```bash
docker compose down
```

## Pine64 deployment and updates

GitHub Actions builds and publishes both `linux/amd64` and `linux/arm64` application images. Copy `compose.yaml`, the entire `caddy/` directory, and `.env` to one deployment directory on the Pine64. The board never receives an application source volume and never runs pnpm or Next.js builds.

Initial deployment and every image update use:

```bash
docker compose config
docker compose pull
docker compose up -d
docker compose ps
```

After changing deployment environment variables, recreate only services whose resolved configuration changed:

```bash
docker compose up -d
```

Compose preserves `caddy_data` and `caddy_config`. The dashboard can restart independently; Caddy remains running and may temporarily return an upstream error until Next.js is accepting requests again. Compose continues to report application readiness through the existing `/api/health` check.

## Operations

Inspect logs:

```bash
docker compose logs --tail=1000 -f caddy
docker compose logs --tail=200 dashboard
```

Both services use Docker's `json-file` driver with a 10 MB maximum file size and three rotated files.

Validate the active environment-expanded Caddy configuration without contacting ACME:

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

After editing files under `caddy/`, validate and gracefully reload without restarting the container:

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

If `.env` changes, use `docker compose up -d` instead so the Caddy container is recreated and its startup fragments are rendered from the new environment. Certificate state remains in `caddy_data`.

## Primary references

- [Caddy official Docker image](https://hub.docker.com/_/caddy/)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy `tls internal`](https://caddyserver.com/docs/caddyfile/directives/tls)
- [Caddy reverse-proxy headers](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers)
- [Caddy in Docker, reloads, logs, and local CA export](https://caddyserver.com/docs/running#docker-compose)
