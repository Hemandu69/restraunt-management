-- Reuses the shared public.set_updated_at() function defined in
-- create_updated_at_trigger.sql for public.profiles.
create trigger set_payments_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();
