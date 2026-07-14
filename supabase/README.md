# Supabase authentication setup

The application is fail-closed: authenticated dashboard routes require a valid
Supabase JWT plus an active row in `public.user_roles`. Login and authorization
will not work until the migration in
`migrations/20260714120000_auth_foundation.sql` is applied to the same Supabase
project used by `.env.local`.

## Apply the migration

The Supabase CLI was not installed or linked when this migration was created,
so it was not applied automatically.

### SQL Editor

1. Open the matching Supabase project.
2. Open **SQL Editor > New query**.
3. Copy the complete contents of
   `migrations/20260714120000_auth_foundation.sql` into the query.
4. Select **Run** once. Do not run isolated fragments.
5. Confirm that `public.profiles` and `public.user_roles` exist and show RLS as
   enabled in **Table Editor**.

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

The application exposes no role mutation operation. Future admin UI must use a
separately designed, server-authorized operation rather than granting clients
write access to `user_roles`.

## Required dashboard settings

In the matching Supabase project:

1. Under **Authentication > Providers > Email**, keep email/password enabled
   and disable public user sign-ups. Accounts are created manually in the
   dashboard.
2. Under **Authentication > URL Configuration**, set **Site URL** to the
   deployed dashboard origin, such as `https://dashboard.example.com`.
3. Add these redirect URLs for local development:
   `http://localhost:3000/de/auth/callback`,
   `http://localhost:3000/en/auth/callback`, and
   `http://localhost:3000/bg/auth/callback`.
4. Add the same three callback paths for the production origin. Add preview or
   staging origins only when those deployments are intentionally trusted.
5. Set the Auth password minimum to at least 8 characters so it matches the
   reset form validation.
6. Configure production SMTP before relying on password-reset delivery. Keep
   the reset-password email template's confirmation URL link intact.

## Security model

- `profiles` contains user-editable identity presentation data. Authenticated
  users can read their own row and update only `display_name`, `avatar_path`,
  and `preferred_locale`; active administrators can read family profiles.
- `user_roles` contains authorization data. Users can read their own role and
  active status; active administrators can read all roles. Neither receives
  insert, update, or delete privileges through the application API.
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

## Type generation

`src/lib/supabase/database.types.ts` is a narrow checked-in type definition for
this migration; it was not generated from the hosted project because no linked
CLI was available. After applying the migration, regenerate from the verified
project without printing credentials:

```bash
supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

Review the diff before committing the generated file.
