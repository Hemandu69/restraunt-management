-- Simulated QR Payment feature.
--
-- Architecture note (see root README "Data architecture" / CI reports for
-- the full picture): user accounts (Manager/Waiter) live in the separate
-- Express backend's Prisma/SQLite database, not in Supabase auth.users -
-- that backend is still the live, active system. Likewise, tables and
-- orders are currently in-memory-only React state with no backing table
-- anywhere (see frontend/src/pages/TablesPage.tsx). This table is
-- deliberately NOT built with foreign keys to auth.users/profiles or to an
-- "orders"/"tables" table, because none of those exist as real rows here:
--
--   - waiter_id stores the Prisma User.id (a UUID) of the waiter who
--     created the payment. It is read from the authenticated request on
--     the backend, never from client input, and is used for authorization
--     (a waiter may only cancel their own payment) - but there is no
--     Supabase-side users table to reference.
--   - table_number and order_reference are informational/display labels
--     only (which table, and a stable id for the in-memory order that was
--     open at creation time). Neither is trusted for authorization or the
--     amount - see amount below.
--
-- The one thing that IS fully authoritative here is `amount`: the backend
-- computes it server-side from its own copy of the menu price list (see
-- backend/src/data/menu.ts and backend/src/lib/money.ts) applied to the
-- item/quantity lines the client requested - never from a client-supplied
-- total. This is what "backend-authoritative amount" (see the payment spec)
-- means in a system that has no persisted order to read a total from.
create table public.payments (
  id uuid primary key default gen_random_uuid(),

  table_number integer not null check (table_number > 0),
  order_reference text not null check (order_reference <> ''),
  waiter_id uuid not null,

  -- Whole INR rupees, no decimal/paise component - matches the existing
  -- money model used everywhere else in the app (see lib/money.ts's
  -- formatInr, which always rounds to a whole rupee).
  amount integer not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),

  status public.payment_status not null default 'PENDING',

  -- SHA-256 hex digest of the secure public token handed to the customer
  -- (in the QR / /pay/:token URL). The raw token is never written to the
  -- database - only the backend that generated it ever sees the raw value,
  -- and it re-hashes an incoming token to look up this row. This means a
  -- database-only leak of this table cannot be replayed as a working
  -- payment link.
  token_hash text not null unique,

  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),

  -- A timestamp may be set only for the state it corresponds to. Combined
  -- with the transition trigger in enforce_payment_transitions.sql, this
  -- makes an inconsistent row (e.g. status PENDING but paid_at populated)
  -- impossible to write, not just unlikely.
  constraint payments_paid_at_matches_status check ((status = 'PAID') = (paid_at is not null)),
  constraint payments_cancelled_at_matches_status check ((status = 'CANCELLED') = (cancelled_at is not null))
);

comment on table public.payments is
  'Simulated QR payment sessions. amount is always computed server-side from the authoritative menu price list, never accepted from client input - see the column comment on amount and backend/src/services/payment.service.ts.';

-- Waiter-facing "my active payments" lookups and the expiry sweep both
-- filter by status; waiter_id backs the ownership check on cancel.
create index payments_status_idx on public.payments (status);
create index payments_waiter_id_idx on public.payments (waiter_id);
