# Family Dashboard

A production-ready foundation for a private family dashboard. The current application intentionally contains no household features or fake data: it provides the responsive shell, design system, internationalization, module boundary, authentication and authorization foundation, development tooling, health endpoint, and a pull-only ARM64/AMD64 deployment path.

## Technology

- Next.js 16 App Router, React 19, and strict TypeScript
- React Server Components by default
- Tailwind CSS 4 and shadcn/ui with Radix primitives
- Lucide icons, `next-themes`, `next-intl`, and Zod
- Supabase JavaScript and SSR clients with cookie-based sessions
- pnpm, ESLint, Prettier, and `prettier-plugin-tailwindcss`
- Standalone Next.js output in a non-root Node.js container

German (`de`) is the default locale. English (`en`) and Bulgarian (`bg`) are also available. Routes always include the locale, for example `/de`, `/de/profile`, and `/de/admin/users`.

## Repository structure

```text
messages/                       Translation messages by locale
src/app/[locale]/(app)/         Localized application routes and boundaries
src/app/api/health/             Dependency-free container health endpoint
src/components/layout/          Reusable responsive application shell
src/components/shared/          Cross-module presentation components
src/components/ui/              Used shadcn/ui components only
src/config/                     Validated application and environment config
src/i18n/                       next-intl routing, navigation, and request config
src/modules/                    Module registry plus feature-owned UI
src/lib/supabase/               Browser, server, and session-refresh clients
.github/workflows/container.yml Multi-platform GHCR image publishing
```

## Local development

Requirements: Node.js 22 or newer and pnpm 10 or newer.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local   # use Copy-Item on PowerShell
pnpm dev
```

Set the two values in `.env.local` before starting the application:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Open [http://localhost:3000](http://localhost:3000). The locale proxy redirects the root path to German. `.env.local` is ignored by Git and must not be committed.

Useful checks:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm supabase:check
pnpm build
pnpm start
```

`pnpm start` runs the regular Next.js production server after `pnpm build`. The deployment image runs the traced standalone server instead.

## Supabase configuration and security

Copy `.env.example` to `.env.local` and provide the project URL and publishable key from the Supabase project's **Connect** dialog or **Settings > API Keys**. The Zod configuration in `src/config/env.ts` validates both values only when Supabase functionality is used. Missing or invalid configuration produces a clear error that names the variables without revealing their contents.

The publishable key is intentionally safe to include in browser code: it identifies a public application client and is designed to be retrievable from browser bundles. It is not an authorization boundary. Every database table exposed through Supabase must still have Row Level Security enabled with narrowly scoped policies for the `anon` and `authenticated` roles.

Secret keys and legacy `service_role` keys have elevated access and can bypass normal data protections. Never put one in a `NEXT_PUBLIC_` variable, browser bundle, Docker build argument, Compose file, source file, log, or repository setting used here. This application does not need an elevated key for its current scope.

The browser client is in `src/lib/supabase/client.ts`; the request-scoped Server Component, Server Action, and Route Handler client is in `src/lib/supabase/server.ts`. `src/lib/supabase/proxy.ts` validates and refreshes cookie-backed sessions and is composed with the locale proxy. Localized login, password recovery, logout, profile and avatar management, server route protection, active-account checks, and secure administrator operations are implemented. Follow [supabase/README.md](supabase/README.md) before attempting to sign in; the application deliberately fails closed until both migrations are applied.

### Profiles and avatars

Signed-in users can open `/<locale>/profile` to view their read-only Auth email, edit their display name, store a preferred language, and upload, replace, or remove an avatar. Profile actions update only `profiles.display_name` and `profiles.preferred_locale`; they cannot change user IDs, Auth email data, roles, or active status.

The second migration creates a private `avatars` Storage bucket with a 2 MB stored-object limit and JPEG, PNG, WebP, and GIF MIME allowlist. Browser code resizes normal still images to a maximum 512-pixel edge before upload without an image-processing dependency. Storage RLS permits active authenticated family members to read avatar objects and permits writes only below the caller's `<user-id>/avatar.<extension>` folder. The database stores only that object path in `profiles.avatar_path`. The server creates five-minute signed display URLs; permanent signed URLs are never stored.

Replacement is ordered so the new object is uploaded and verified before its path is committed. An old object with a different extension is then removed. If cleanup fails, the server attempts to restore the old path and remove the new object instead of silently accumulating obsolete files.

### Administrator area

Active administrators see the localized `/<locale>/admin/users` navigation item. The route is protected again in its server layout; hiding the item is not the authorization boundary. PostgreSQL RPC functions independently verify `auth.uid()` is an active admin and serialize checks that prevent self-deactivation and removal or deactivation of the final active admin. Direct application-client writes to `user_roles` remain revoked.

The page lists profile data, preferred language, role, status, and creation date with responsive table and mobile-card layouts. Other users' email addresses are intentionally omitted because they cannot be retrieved from Supabase Auth with the publishable key. The area does not create, invite, delete, or change passwords for Supabase Auth users.

To add Auth Admin operations in the future, use a server-only Supabase secret key in a carefully isolated backend. Such a key must never use a `NEXT_PUBLIC_` name, enter a Client Component graph, be embedded in the container image, or be exposed to the browser. No such key is requested or required by the current application.

### Verify client initialization

With `.env.local` configured, run:

```bash
pnpm supabase:check
```

The check validates configuration and initializes a non-persistent Supabase client. It does not query a database table, create data, authenticate a fake user, or print configuration values. The normal test suite also covers valid, missing, and invalid configuration:

```bash
pnpm test
```

## Rendering conventions

Pages, layouts, metadata, the shell structure, and static module content are Server Components. A component becomes a Client Component only when browser interaction requires it. Today that boundary is limited to shadcn sidebar state, theme selection, locale selection, and the App Router error reset control.

Do not add client-side fetching or global state to the base shell. Future data should be read in the owning module's Server Components or server-side operations unless an interaction specifically requires client state.

## Adding a future module

1. Create `src/modules/<module-name>` and add only the folders its implementation needs, such as `components`, `schemas`, `server`, or `data-access`.
2. Add the route below `src/app/[locale]/(app)`.
3. Add translation keys to all three message files.
4. Register the module once in `src/modules/registry.ts`; the sidebar derives its navigation from that registry.
5. Keep server-only code out of Client Component import graphs and add tests alongside the module.

Do not register unfinished modules or add placeholder dashboard cards.

## Docker

Build and run locally. The public Supabase values must be passed as build arguments because Next.js embeds `NEXT_PUBLIC_` variables during `next build`:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -t family-dashboard:local .
docker run --rm --name family-dashboard -p 3000:3000 family-dashboard:local
```

On PowerShell, use `$env:NEXT_PUBLIC_SUPABASE_URL` and `$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the corresponding `--build-arg` values.

Or validate the pull-oriented Compose definition with a local image override:

```bash
DASHBOARD_IMAGE=family-dashboard:local docker compose up -d
docker compose ps
docker compose down
```

On PowerShell, set the override with `$env:DASHBOARD_IMAGE='family-dashboard:local'` before running Compose.

The runtime stage contains the standalone server, static assets, and public assets only. It runs as UID/GID `1001`, listens on `0.0.0.0:3000`, and exposes `/api/health` to both Docker and Compose health checks. The health endpoint remains independent of Supabase.

## GitHub Container Registry

Pushes to `main` and manual workflow runs build `linux/amd64` and `linux/arm64` images using Buildx. The workflow publishes a commit-SHA tag every time and publishes `latest` only for `main`. GitHub Actions cache is shared across builds. Image names are generated from the repository as `ghcr.io/<owner>/<repository>`.

Before running the workflow, configure these GitHub Actions repository variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

In the GitHub repository, open **Settings > Secrets and variables > Actions**, select the **Variables** tab, and add both as repository variables. They are passed to the Docker build without being hard-coded in the workflow. Repository variables are appropriate because both values are public client configuration; do not add a secret or service-role key.

Supplying these values only through `compose.yaml` after the image is built is too late for browser code. Next.js freezes `NEXT_PUBLIC_` values into the client bundle at build time, so any change to the project URL or publishable key requires a new Docker image build and deployment.

Set the deployment image on the Pine64 in a `.env` file beside `compose.yaml`:

```env
DASHBOARD_IMAGE=ghcr.io/OWNER/REPOSITORY:latest
```

For a private repository or package, create a GitHub personal access token with `read:packages`, then authenticate once on the Pine64 without placing the token in Compose:

```bash
export CR_PAT='YOUR_TOKEN'
echo "$CR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
unset CR_PAT
```

The package must grant the account access. Docker stores the login in the deploying user's Docker configuration.

### Pine64 deployment and updates

Copy `compose.yaml` and the deployment `.env` to the board once. Every deployment or update is then exactly:

```bash
docker compose pull
docker compose up -d
```

The Pine64 never runs `pnpm install`, `pnpm build`, or `next build`. Compilation and multi-platform image creation happen in GitHub Actions.

## Scope

Authentication, profile and private-avatar management, role storage, active-account enforcement, and basic user administration are present. Public registration, invitations, Auth user creation/deletion, Auth Admin APIs, and unrelated family dashboard modules remain deliberately out of scope.
