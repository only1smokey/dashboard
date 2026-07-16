# Supabase authentication setup

The application is fail-closed: authenticated dashboard routes require a valid
Supabase JWT plus an active row in `public.user_roles`. Login and authorization
will not work until all versioned migrations are applied to the same Supabase
project used by `.env.local`:

1. `migrations/20260714120000_auth_foundation.sql`
2. `migrations/20260714160000_profiles_avatars_admin.sql`
3. `migrations/20260716120000_user_locations.sql`
4. `migrations/20260716160000_photon_user_locations.sql`
5. `migrations/20260716190000_user_locations_delete_access.sql`
6. `migrations/20260716220000_realtime_presence.sql`

## Apply the migration

The Supabase CLI was not installed or linked when this migration was created,
so it was not applied automatically.

### SQL Editor

1. Open the matching Supabase project.
2. Open **SQL Editor > New query**.
3. Copy and run the complete contents of the authentication-foundation migration.
4. Open a new query, then copy and run the complete contents of the profiles,
   avatars, and admin migration.
5. Open a new query for each location migration and run them in order. The
   Photon migration replaces the earlier Open-Meteo table and clears any
   incompatible saved locations. Do not run isolated fragments or reverse the
   order.
6. Run the complete Realtime Presence migration in a new query. It creates the
   persistent Presence table/RPCs and all four `realtime.messages` policies in
   one script; do not add application tables to the Realtime publication.
7. Confirm that `public.profiles`, `public.user_roles`,
   `public.user_locations`, and `public.user_presence` exist with RLS enabled,
   and that **Storage > Buckets** shows a private `avatars` bucket.

### Supabase CLI

Only use this path after installing the CLI, signing in, and deliberately
linking this repository to the exact project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list
supabase db push
```

Review the project reference printed by `supabase link` before `db push`. The
application never needs a service-role key or database password at runtime.

## Create and promote the first administrator

1. In **Authentication > Users**, create the family account manually.
2. Copy its UUID from the user details. Do not identify the target by an email
   stored in source code.
3. Open `first-admin.sql` and replace every occurrence of the all-zero UUID with
   that exact UUID.
4. Run the first `select` alone and verify the email and creation time describe
   the intended account.
5. Run the transaction block. It aborts unless exactly one `user_roles` row is
   updated.
6. Run the final `select` and verify `role = 'admin'` and `is_active = true`.

The first-admin SQL remains the bootstrap procedure because the admin RPCs
correctly require an existing active administrator. After this one-time step,
active admins can manage roles and active application access at
`/<locale>/admin/users`.

## Required dashboard settings

In the matching Supabase project:

1. Under **Authentication > Providers > Email**, keep email/password enabled
   and disable public user sign-ups. Accounts are created manually in the
   dashboard.
2. Under **Authentication > URL Configuration**, set **Site URL** to the exact
   `APP_URL` origin, such as `https://dashboard.example.com`.
3. Add these redirect URLs for local development:
   `http://localhost:3000/de/auth/callback`,
   `http://localhost:3000/en/auth/callback`, and
   `http://localhost:3000/bg/auth/callback`.
4. Add these exact production redirect URLs, replacing the origin with the
   current `APP_URL`: `${APP_URL}/de/auth/callback`,
   `${APP_URL}/en/auth/callback`, and `${APP_URL}/bg/auth/callback`. Add preview
   or staging origins only when those deployments are intentionally trusted.
5. Under **Realtime > Settings**, disable public channel access. The Presence
   migration authorizes only the private `presence:dashboard` and
   `presence:admin-status` topics through `realtime.messages` RLS policies.
6. Under **Authentication > Passkeys**, set the Relying Party ID to the exact
   `APP_DOMAIN` (no scheme, port, or path) and the allowed Relying Party Origin
   to the exact `APP_URL`. Changing the RP ID makes Passkeys registered for the
   previous RP ID unusable.
7. Set the Auth password minimum to at least 8 characters so it matches the
   reset form validation.
8. Configure production SMTP before relying on password-reset delivery. Keep
   the reset-password email template's confirmation URL link intact.

Changing `.env` or recreating Docker containers cannot modify hosted Supabase
Dashboard settings. Repeat the Site URL, redirect URL, and Passkey changes
manually whenever `APP_DOMAIN` or `APP_URL` changes.

## Security model

- `profiles` contains user-editable identity presentation data. Authenticated
  users can read their own row and directly update only `display_name` and
  `preferred_locale`; active administrators can read family profiles.
- `user_roles` contains authorization data. Users can read their own role and
  active status; active administrators can read all roles. Neither receives
  insert, update, or delete privileges through the application API.
- `user_locations` keeps each Photon country selection and its optional address
  separately for home and viewing. Active users can read, insert, update, and
  delete only their own rows; other household members and anonymous requests
  cannot read this location data.
- `user_presence` stores only low-frequency last seen information and the four
  owner-controlled Presence privacy preferences. Authenticated clients receive
  no direct write grant; no-argument or preference-only RPCs derive the target
  account from `auth.uid()` and require active membership.
- `public.get_people_directory()` is a narrow security-definer directory RPC.
  It accepts no user ID, returns only active profiles with display name and
  avatar path, and suppresses last seen when online visibility is disabled.
- Private Realtime Authorization policies allow active accounts to publish and
  receive Presence on `presence:dashboard`. All active accounts may publish
  minimal status on `presence:admin-status`, but only active administrators may
  receive that topic. Both policy sets are restricted to the Presence extension
  and private channels; no application table is added to `supabase_realtime`.
- Anonymous database requests receive no table privileges or policies.
- `private.is_admin()` has an empty search path, accepts no user ID, derives the
  caller from `auth.uid()`, and avoids recursive role policies.
- The Auth user trigger creates both mandatory rows atomically with role `user`
  and `is_active = true`. It uses safe display-name metadata when present. A
  provisioning error is logged and aborts Auth user creation rather than
  leaving a partial application account. Inspect Supabase Postgres/Auth logs,
  correct the migration or data problem, and retry user creation.
- Existing Auth users are backfilled without overwriting any existing profile
  or role rows.
- `avatars` is private and limited to 2 MB JPEG, PNG, WebP, and GIF objects.
  Active members may read objects; insert, update, and delete policies require
  the first path segment to equal `auth.uid()`. Only predictable
  `<user-id>/avatar.<extension>` names are accepted for writes.
- `public.set_own_avatar_path` verifies the caller is active, the path belongs
  to that caller, and the object exists before storing only the object path.
  Display URLs are short-lived signed URLs and are not database values.
- Admin RPCs verify the caller through `auth.uid()` and `private.is_admin()`,
  use an empty `search_path`, validate their inputs, and serialize final-admin
  checks. Unnecessary function access is revoked. Direct `user_roles` writes
  remain unavailable to authenticated clients.
- Deactivation affects application access only; it does not disable or delete
  the Supabase Auth identity. Protected server layouts redirect inactive users
  to a localized disabled-account page where logout remains available.

## Auth administration limitation

The application does not create or invite Auth users, delete Auth identities,
change passwords as an administrator, or expose Auth Admin APIs. Other users'
Auth email addresses are therefore omitted from the admin page. Adding those
operations later requires a Supabase secret key kept strictly in server-only
code; never expose it through `NEXT_PUBLIC_` configuration or browser code.

## Type generation

`src/lib/supabase/database.types.ts` is a narrow checked-in type definition for
this migration; it was not generated from the hosted project because no linked
CLI was available. After applying the migration, regenerate from the verified
project without printing credentials:

```bash
supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

Review the diff before committing the generated file.
