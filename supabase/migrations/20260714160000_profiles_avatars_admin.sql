-- Profile avatars, active-member storage access, and secure administrator
-- operations for the private family dashboard.
-- Run as the project owner through Supabase migrations or the SQL Editor.

-- A private bucket keeps object URLs unusable without a short-lived signed URL.
-- Bucket-level constraints are enforced by Storage before object policies run.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- This helper avoids user_roles RLS recursion and is also used by Storage
-- policies so deactivated accounts immediately lose avatar access.
create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and is_active = true
  );
$$;

revoke all on function private.is_active_member() from public, anon, authenticated;
grant execute on function private.is_active_member() to authenticated;

drop policy if exists "avatars_select_active_members" on storage.objects;
create policy "avatars_select_active_members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (select private.is_active_member())
);

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/avatar\.(jpg|jpeg|png|webp|gif)$')
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/avatar\.(jpg|jpeg|png|webp|gif)$')
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (select private.is_active_member())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Avatar paths can no longer be written with an ordinary profiles update.
-- This RPC accepts only the caller's predictable path, verifies that the
-- object exists, and returns the previous path so the Server Action can clean
-- up an old extension after a successful replacement.
revoke update (avatar_path) on table public.profiles from authenticated;

create or replace function public.set_own_avatar_path(p_avatar_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  previous_path text;
begin
  if caller_id is null or not (select private.is_active_member()) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if p_avatar_path is not null then
    if p_avatar_path !~ ('^' || caller_id::text || '/avatar\.(jpg|jpeg|png|webp|gif)$') then
      raise exception using errcode = 'P0001', message = 'invalid_avatar_path';
    end if;

    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'avatars'
        and name = p_avatar_path
    ) then
      raise exception using errcode = 'P0001', message = 'avatar_not_found';
    end if;
  end if;

  select avatar_path
  into previous_path
  from public.profiles
  where id = caller_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  update public.profiles
  set avatar_path = p_avatar_path,
      updated_at = now()
  where id = caller_id;

  return previous_path;
end;
$$;

revoke all on function public.set_own_avatar_path(text) from public, anon;
grant execute on function public.set_own_avatar_path(text) to authenticated;

create or replace function public.admin_set_user_role(
  p_target_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_role text;
  target_active boolean;
  remaining_active_admins integer;
begin
  -- Serialize before authorization too, so a caller demoted or deactivated by
  -- a concurrent admin request cannot continue on a stale authorization check.
  lock table public.user_roles in share row exclusive mode;

  if caller_id is null or not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if p_target_user_id is null then
    raise exception using errcode = 'P0001', message = 'invalid_target';
  end if;

  if p_role not in ('user', 'admin') then
    raise exception using errcode = 'P0001', message = 'invalid_role';
  end if;

  select role, is_active
  into target_role, target_active
  from public.user_roles
  where user_id = p_target_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'target_not_found';
  end if;

  if target_role = 'admin' and target_active and p_role = 'user' then
    select count(*)
    into remaining_active_admins
    from public.user_roles
    where role = 'admin'
      and is_active = true
      and user_id <> p_target_user_id;

    if remaining_active_admins = 0 then
      raise exception using errcode = 'P0001', message = 'last_active_admin';
    end if;
  end if;

  update public.user_roles
  set role = p_role,
      updated_at = now()
  where user_id = p_target_user_id;
end;
$$;

create or replace function public.admin_set_user_active(
  p_target_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_role text;
  target_active boolean;
  remaining_active_admins integer;
begin
  lock table public.user_roles in share row exclusive mode;

  if caller_id is null or not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'not_authorized';
  end if;

  if p_target_user_id is null or p_is_active is null then
    raise exception using errcode = 'P0001', message = 'invalid_target';
  end if;

  if p_target_user_id = caller_id and p_is_active = false then
    raise exception using errcode = 'P0001', message = 'cannot_deactivate_self';
  end if;

  select role, is_active
  into target_role, target_active
  from public.user_roles
  where user_id = p_target_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'target_not_found';
  end if;

  if target_role = 'admin' and target_active and p_is_active = false then
    select count(*)
    into remaining_active_admins
    from public.user_roles
    where role = 'admin'
      and is_active = true
      and user_id <> p_target_user_id;

    if remaining_active_admins = 0 then
      raise exception using errcode = 'P0001', message = 'last_active_admin';
    end if;
  end if;

  update public.user_roles
  set is_active = p_is_active,
      updated_at = now()
  where user_id = p_target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
revoke all on function public.admin_set_user_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
