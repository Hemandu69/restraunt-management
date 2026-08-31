-- Minimal, explicit RLS for public.profiles. No broad "authenticated can do
-- everything" policy exists. Manager-level staff management (listing every
-- user, changing someone else's role/status) is deliberately NOT modeled
-- here - it will be implemented later behind the backend's service-role
-- key, which bypasses RLS entirely and enforces its own authorization.
alter table public.profiles enable row level security;

-- A user may read only their own profile row.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- A user may update only their own row, and never their id/role/status:
-- the with-check subqueries compare the incoming row's role/status against
-- whatever is currently stored, so any update statement that tries to
-- change either column is rejected - including one that also (legitimately)
-- changes `name` in the same statement. This is what stops a client from
-- promoting themselves STAFF -> MANAGER or reactivating/deactivating
-- themselves through a normal profile update.
--
-- The service-role key used by the backend bypasses RLS entirely (it has
-- the BYPASSRLS attribute in Supabase), so this restriction only ever
-- applies to requests made with a user's own session, never to the
-- server-side Manager staff-management flow that will be built later.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );

-- No insert/delete policies: rows are created only by the
-- handle_new_auth_user trigger (SECURITY DEFINER, bypasses RLS) and removed
-- only via the ON DELETE CASCADE from auth.users. Authenticated/anon clients
-- get no direct insert or delete access to this table.
