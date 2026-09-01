-- Simulated QR Payment feature.
-- Explicit state machine for a payment session. Only the four states the
-- application actually implements are defined here - see
-- enforce_payment_transitions.sql for the one-way transition rules enforced
-- on top of this type.

create type public.payment_status as enum ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');
