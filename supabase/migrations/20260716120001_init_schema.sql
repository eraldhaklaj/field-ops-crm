-- Field-sales CRM slice: schema
-- Multi-tenant model: orgs (tenants) -> profiles (users) -> leads (core entity).

-- Tenants.
create table public.orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Users. profiles.id is the same uuid as auth.users.id.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references public.orgs(id) on delete restrict,
  full_name  text not null,
  role       text not null default 'rep' check (role in ('rep','admin','superadmin')),
  created_at timestamptz not null default now()
);
create index profiles_org_id_idx on public.profiles(org_id);

-- Core entity.
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  customer_name text not null,
  address      text,
  service_type text not null default 'HVAC'
                 check (service_type in ('HVAC','Plumbing','Roofing','Electrical','Solar')),
  status       text not null default 'new'
                 check (status in ('new','assigned','won','lost')),
  value_cents  integer not null default 0 check (value_cents >= 0),
  assigned_to  uuid references public.profiles(id) on delete set null,
  source       text not null default 'manual',
  sla_due_at   timestamptz,
  is_stale     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index leads_org_status_idx  on public.leads(org_id, status);
create index leads_assigned_to_idx on public.leads(assigned_to);

-- Helper functions used by the RLS policies below.
-- They are SECURITY DEFINER so they read profiles as the table owner, which
-- bypasses RLS and avoids the classic infinite-recursion on profiles' own policy.
create or replace function public.auth_org_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'superadmin' from public.profiles where id = auth.uid()), false);
$$;

-- Base table privileges for the API role. RLS (next migration) decides which
-- ROWS are visible; these GRANTs decide which tables the role may touch at all.
-- Nothing is granted to anon: the whole app is behind login, and the public
-- webhook uses the service role instead.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select on public.orgs to authenticated;
-- Profiles: readable, but a user may only edit their own display name. Column-level
-- grant plus the RLS check together block role/org self-escalation.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- The service role is the trusted server identity used by the lead-intake edge
-- function. It bypasses RLS, but still needs table privileges. Give it full
-- access to the app tables (idempotent on hosted Supabase, required locally).
grant usage on schema public to service_role;
grant all on public.orgs, public.profiles, public.leads to service_role;
