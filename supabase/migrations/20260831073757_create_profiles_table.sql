-- public.profiles extends auth.users with the application-owned fields.
-- auth.users (managed entirely by Supabase Auth) remains the sole owner of
-- credentials; this table must never gain a password/secret column.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role public.user_role not null default 'STAFF',
  status public.user_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table public.profiles is
  'Application profile for each auth.users row. role/status drive authorization and are never directly client-writable - see the RLS policies in configure_profile_rls.sql.';

-- Evaluated indexes: `role` and `status` are the two columns future staff
-- management screens will filter/list by (e.g. "all active staff"), so both
-- earn an index. No other column has a known filter/lookup pattern yet.
create index profiles_role_idx on public.profiles (role);
create index profiles_status_idx on public.profiles (status);
