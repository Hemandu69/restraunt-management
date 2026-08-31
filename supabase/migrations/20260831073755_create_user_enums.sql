-- Phase 1: Authentication & Role Hierarchy foundation.
-- Enumerated types backing public.profiles. Only the two roles/statuses
-- needed for this phase are defined here; future roles/statuses get their
-- own migration (`alter type ... add value ...`) rather than being
-- pre-added speculatively.

create type public.user_role as enum ('MANAGER', 'STAFF');

create type public.user_status as enum ('ACTIVE', 'INACTIVE');
