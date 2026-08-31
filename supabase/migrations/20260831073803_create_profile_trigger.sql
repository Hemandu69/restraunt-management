-- Automatically provisions a public.profiles row whenever a new auth.users
-- account is created, so the application never has an auth user without a
-- matching profile.
--
-- SECURITY DEFINER is required here: the trigger fires in the context of
-- the auth schema's insert into auth.users, which does not otherwise carry
-- INSERT privilege on public.profiles. An explicit search_path is set to
-- avoid search_path hijacking of a definer-rights function, and every
-- identifier is schema-qualified regardless.
--
-- Role/status are HARD-CODED to STAFF/ACTIVE. Signup metadata (whatever a
-- client passed as `options.data` to supabase.auth.signUp) is read only for
-- a display name - never for role - so a signup payload containing
-- `{"role": "MANAGER"}` is silently ignored and still produces a STAFF
-- profile. This is what prevents self-promotion at signup time; a real
-- Manager is provisioned later through a controlled, server-side process
-- (see supabase/README section "Provisioning the first Manager").
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
    'STAFF',
    'ACTIVE'
  );
  return new;
end;
$$;

-- Defense in depth: this function must only ever run as the trigger below,
-- never be callable directly by anon/authenticated clients.
revoke execute on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
