-- Replace the UUID below with the exact user ID copied from
-- Supabase Dashboard > Authentication > Users. Verify the user before running
-- the transaction; do not identify an administrator by an email hard-coded in
-- application source or migration history.

select id, email, created_at
from auth.users
where id = '00000000-0000-0000-0000-000000000000'::uuid;

begin;

do $$
declare
  target_user_id constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  affected_rows integer;
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace target_user_id with the selected Auth user UUID';
  end if;

  update public.user_roles
  set role = 'admin'
  where user_id = target_user_id;

  get diagnostics affected_rows = row_count;

  if affected_rows <> 1 then
    raise exception 'Expected exactly one user_roles row, updated %', affected_rows;
  end if;
end;
$$;

commit;

-- Use the same selected UUID here to verify role and active status.
select user_id, role, is_active, updated_at
from public.user_roles
where user_id = '00000000-0000-0000-0000-000000000000'::uuid;
