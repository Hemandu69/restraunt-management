-- Product-model correction: the operational role is specifically a WAITER,
-- not a generic "staff" member (this restaurant has no chef/kitchen/cashier
-- roles). Renaming the enum VALUE in place (rather than dropping/recreating
-- the type) is the safe, idempotent-on-reapply way to do this in Postgres:
-- every existing profiles.role = 'STAFF' row automatically reads as
-- 'WAITER' after this runs, with no separate data UPDATE needed.
alter type public.user_role rename value 'STAFF' to 'WAITER';

-- The signup trigger must keep defaulting new accounts to the (renamed)
-- non-manager role. CREATE OR REPLACE is the correct way to change a
-- function after its migration has already shipped - never edit the
-- original create_profile_trigger.sql migration in place.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, role, status)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(split_part(new.email, '@', 1)), ''),
      'New User'
    ),
    'WAITER',
    'ACTIVE'
  );
  return new;
end;
$$;
