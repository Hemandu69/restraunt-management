-- Enforces the payment state machine at the database level, so an invalid
-- transition is rejected even if it were ever attempted outside the
-- backend's own conditional-update logic (see payment.service.ts, which
-- additionally relies on this trigger for atomic, race-free approval - see
-- that file's comments on idempotency).
--
-- The only state allowed to transition anywhere is PENDING. Every other
-- state (PAID, EXPIRED, CANCELLED) is terminal: once set, a row's status
-- can never change again, in either direction.
create or replace function public.enforce_payment_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status <> old.status and old.status <> 'PENDING' then
    raise exception
      'Invalid payment status transition: % -> % (only PENDING may transition; % is terminal)',
      old.status, new.status, old.status
      using errcode = '22023'; -- invalid_parameter_value
  end if;
  return new;
end;
$$;

create trigger enforce_payment_status_transition
  before update on public.payments
  for each row
  execute function public.enforce_payment_status_transition();
