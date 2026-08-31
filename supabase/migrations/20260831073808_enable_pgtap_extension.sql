-- pgTAP powers the database test suite in supabase/tests/database (run via
-- `supabase test db`). Enabling it as a migration keeps local, CI, and
-- (harmlessly) production schemas identical - it adds test-assertion
-- functions only, no tables/data.
create extension if not exists pgtap with schema extensions;
