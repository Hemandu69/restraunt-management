-- pgTAP tests for the Authentication & Role Hierarchy foundation.
-- Run with: supabase test db
--
-- The whole file runs inside one transaction (begin/rollback), so nothing
-- here persists. clock_timestamp() (not now()) is used by the updated_at
-- trigger specifically so test 10 below can observe a real time difference
-- within that single transaction.

begin;
select plan(10);

-- 1. profiles table exists.
select has_table('public', 'profiles', 'public.profiles should exist');

-- 2. role enum accepts MANAGER and WAITER.
select enum_has_labels(
  'public', 'user_role', array['MANAGER', 'WAITER'],
  'user_role should accept MANAGER and WAITER'
);

-- 3. status enum accepts ACTIVE and INACTIVE.
select enum_has_labels(
  'public', 'user_status', array['ACTIVE', 'INACTIVE'],
  'user_status should accept ACTIVE and INACTIVE'
);

-- 4. profile references auth.users.
select fk_ok(
  'public', 'profiles', 'id', 'auth', 'users', 'id',
  'profiles.id should reference auth.users.id'
);

-- Fixture: two auth users created directly at the DB level (this is a
-- DB-level pgTAP test, so we bypass the GoTrue HTTP API and insert the row
-- the same way it would land in auth.users after a real signup). User A's
-- metadata deliberately requests role "MANAGER" to prove the trigger
-- ignores it.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'user-a@example.com', crypt('password123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"User A","role":"MANAGER"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'user-b@example.com', crypt('password123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"User B"}'::jsonb,
    now(), now(), '', '', '', ''
  );

-- 5. new Auth users receive a WAITER profile - even though User A's signup
--    metadata asked for role "MANAGER".
select is(
  (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111')::text,
  'WAITER',
  'a new auth user gets a WAITER profile regardless of requested signup role'
);

-- 6. new profiles default to ACTIVE.
select is(
  (select status from public.profiles where id = '11111111-1111-1111-1111-111111111111')::text,
  'ACTIVE',
  'a new profile defaults to ACTIVE'
);

-- Simulate User A's own authenticated session for the RLS checks below.
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- 7. a client cannot promote themselves to MANAGER.
select throws_ok(
  $$ update public.profiles set role = 'MANAGER' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a client cannot change their own role via a normal profile update'
);

-- 8. a client cannot change their own status.
select throws_ok(
  $$ update public.profiles set status = 'INACTIVE' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'a client cannot change their own status via a normal profile update'
);

-- 9. a normal authenticated user cannot read another user's profile
--    (RLS filters the row out rather than raising - the select just
--    returns zero rows).
select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'an authenticated user cannot read another user''s profile'
);

-- 10. updated_at changes after an update (own name change, which IS allowed).
create temporary table _updated_at_before as
  select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set name = 'User A Renamed' where id = '11111111-1111-1111-1111-111111111111';

select isnt(
  (select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  (select updated_at from _updated_at_before),
  'updated_at should change after an allowed update'
);

select * from finish();
rollback;
