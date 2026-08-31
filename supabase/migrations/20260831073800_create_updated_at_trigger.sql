-- Reusable updated_at maintenance so no client ever has to set it manually.
-- Any future table with an `updated_at timestamptz` column can reuse this
-- same function via its own `before update` trigger.
--
-- Uses clock_timestamp() rather than now(): now()/transaction_timestamp()
-- is frozen for the entire transaction, which would make updated_at equal
-- created_at whenever an insert and update happen in the same transaction
-- (as they do in the pgTAP tests). clock_timestamp() reflects true wall time.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
