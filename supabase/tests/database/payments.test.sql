-- pgTAP tests for the Simulated QR Payment schema.
-- Run with: supabase test db
--
-- These tests exercise the database layer directly (constraints, the
-- transition trigger, and RLS default-deny) - the backend's HTTP-level
-- security tests (auth, ownership, idempotency) live in
-- backend/tests/payments.test.ts and are a separate, complementary layer.

begin;
select plan(13);

-- 1. payments table exists.
select has_table('public', 'payments', 'public.payments should exist');

-- 2. payment_status enum has exactly the four documented states.
select enum_has_labels(
  'public', 'payment_status', array['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'],
  'payment_status should accept PENDING, PAID, EXPIRED, CANCELLED'
);

-- 3. RLS is enabled.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.payments'::regclass),
  'row level security should be enabled on public.payments'
);

-- 4. amount must be positive.
select throws_ok(
  $$ insert into public.payments (table_number, order_reference, waiter_id, amount, token_hash, expires_at)
     values (1, 'order-a', gen_random_uuid(), 0, 'hash-zero-amount', now() + interval '10 minutes') $$,
  '23514',
  null,
  'a payment with amount <= 0 should be rejected'
);

-- 5. table_number must be positive.
select throws_ok(
  $$ insert into public.payments (table_number, order_reference, waiter_id, amount, token_hash, expires_at)
     values (0, 'order-b', gen_random_uuid(), 500, 'hash-zero-table', now() + interval '10 minutes') $$,
  '23514',
  null,
  'a payment with table_number <= 0 should be rejected'
);

-- 6. currency is restricted to INR.
select throws_ok(
  $$ insert into public.payments (table_number, order_reference, waiter_id, amount, currency, token_hash, expires_at)
     values (1, 'order-c', gen_random_uuid(), 500, 'USD', 'hash-bad-currency', now() + interval '10 minutes') $$,
  '23514',
  null,
  'a currency other than INR should be rejected'
);

-- Fixture: one valid PENDING payment to exercise the state machine on.
insert into public.payments (id, table_number, order_reference, waiter_id, amount, token_hash, expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  4, 'order-fixture', gen_random_uuid(), 700, 'hash-fixture-token',
  now() + interval '10 minutes'
);

-- 7. new payment defaults to PENDING.
select is(
  (select status::text from public.payments where id = '33333333-3333-3333-3333-333333333333'),
  'PENDING',
  'a new payment should default to PENDING'
);

-- 8. PENDING -> PAID is allowed, and requires paid_at to be set in the same
--    statement (the payments_paid_at_matches_status check).
update public.payments
  set status = 'PAID', paid_at = now()
  where id = '33333333-3333-3333-3333-333333333333';

select is(
  (select status::text from public.payments where id = '33333333-3333-3333-3333-333333333333'),
  'PAID',
  'PENDING -> PAID should succeed'
);

-- 9. PAID -> PENDING is rejected (terminal state).
select throws_ok(
  $$ update public.payments set status = 'PENDING' where id = '33333333-3333-3333-3333-333333333333' $$,
  null,
  null,
  'PAID -> PENDING should be rejected'
);

-- 10. PAID -> CANCELLED is rejected (a completed payment must stay completed).
select throws_ok(
  $$ update public.payments set status = 'CANCELLED', cancelled_at = now()
     where id = '33333333-3333-3333-3333-333333333333' $$,
  null,
  null,
  'PAID -> CANCELLED should be rejected'
);

-- 11. a second, independent PENDING payment can be cancelled.
insert into public.payments (id, table_number, order_reference, waiter_id, amount, token_hash, expires_at)
values (
  '44444444-4444-4444-4444-444444444444',
  5, 'order-fixture-2', gen_random_uuid(), 300, 'hash-fixture-token-2',
  now() + interval '10 minutes'
);

update public.payments
  set status = 'CANCELLED', cancelled_at = now()
  where id = '44444444-4444-4444-4444-444444444444';

select is(
  (select status::text from public.payments where id = '44444444-4444-4444-4444-444444444444'),
  'CANCELLED',
  'PENDING -> CANCELLED should succeed'
);

-- 12. CANCELLED -> PAID is rejected (a cancelled payment can never be approved).
select throws_ok(
  $$ update public.payments set status = 'PAID', paid_at = now()
     where id = '44444444-4444-4444-4444-444444444444' $$,
  null,
  null,
  'CANCELLED -> PAID should be rejected'
);

-- 13. RLS default-deny: an anon/authenticated role sees no rows at all
--     (no policies grant them access, so the row is filtered out rather
--     than erroring).
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';

select is(
  (select count(*)::int from public.payments),
  0,
  'an authenticated client should see zero payment rows (no policies grant access)'
);

select * from finish();
rollback;
