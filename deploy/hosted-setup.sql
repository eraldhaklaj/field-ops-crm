-- Combined hosted setup for the Supabase SQL Editor.
-- 1. In your project: Database > Extensions, enable pg_cron (one toggle).
-- 2. Paste this whole file into the SQL Editor and Run.
-- Applies the four migrations in order, then seeds two tenants + demo users.

-- ================= 20260716120001_init_schema =================
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

-- ================= 20260716120002_rls_policies =================
-- Row-level security: tenant isolation plus role rules.
-- Every table is deny-by-default once RLS is on; policies below open specific paths.

alter table public.orgs     enable row level security;
alter table public.profiles enable row level security;
alter table public.leads    enable row level security;

-- ORGS: you see your own org; a superadmin sees all.
create policy "orgs read own or superadmin"
  on public.orgs for select to authenticated
  using ( id = public.auth_org_id() or public.is_superadmin() );

-- PROFILES: you see people in your org; a superadmin sees all.
create policy "profiles read own org or superadmin"
  on public.profiles for select to authenticated
  using ( org_id = public.auth_org_id() or public.is_superadmin() );

-- You may rename yourself, but not change your own org or escalate your role.
create policy "profiles update self name only"
  on public.profiles for update to authenticated
  using ( id = auth.uid() )
  with check ( id = auth.uid()
               and org_id = public.auth_org_id()
               and role  = public.auth_role() );

-- LEADS: strict tenant isolation on read.
create policy "leads read own org or superadmin"
  on public.leads for select to authenticated
  using ( org_id = public.auth_org_id() or public.is_superadmin() );

-- Insert only into your own org.
create policy "leads insert into own org"
  on public.leads for insert to authenticated
  with check ( org_id = public.auth_org_id() );

-- Update only within your own org (superadmin anywhere).
create policy "leads update own org or superadmin"
  on public.leads for update to authenticated
  using ( org_id = public.auth_org_id() or public.is_superadmin() )
  with check ( org_id = public.auth_org_id() or public.is_superadmin() );

-- Delete: an admin inside the org, or a superadmin.
create policy "leads delete by admin in org"
  on public.leads for delete to authenticated
  using ( (public.auth_role() = 'admin' and org_id = public.auth_org_id())
          or public.is_superadmin() );

-- ================= 20260716120003_rpcs =================
-- SECURITY DEFINER RPCs.
-- These run with elevated rights, so each one re-checks the caller explicitly.
-- That is the safe way to use SECURITY DEFINER: never trust that RLS alone gates it.

-- Assign a lead to a rep.
-- Allowed for a superadmin anywhere, or an admin within the lead's own org.
-- The target rep must belong to that same org.
create or replace function public.assign_lead(p_lead_id uuid, p_rep_id uuid)
returns public.leads
language plpgsql security definer set search_path = public
as $$
declare
  v_lead public.leads;
  v_rep_org uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    raise exception 'lead not found' using errcode = 'no_data_found';
  end if;

  if not public.is_superadmin() then
    if public.auth_role() <> 'admin' or public.auth_org_id() <> v_lead.org_id then
      raise exception 'not authorized to assign leads in this org'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  select org_id into v_rep_org from public.profiles where id = p_rep_id;
  if v_rep_org is null or v_rep_org <> v_lead.org_id then
    raise exception 'rep does not belong to the lead''s org'
      using errcode = 'check_violation';
  end if;

  update public.leads
     set assigned_to = p_rep_id,
         status = case when status = 'new' then 'assigned' else status end
   where id = p_lead_id
  returning * into v_lead;

  return v_lead;
end;
$$;

revoke all on function public.assign_lead(uuid, uuid) from public;
grant execute on function public.assign_lead(uuid, uuid) to authenticated;

-- Cross-tenant rollup that powers the super-admin control plane.
-- SECURITY DEFINER because it reads across every org, so it hard-gates on superadmin.
create or replace function public.superadmin_org_rollup()
returns table (
  org_id               uuid,
  org_name             text,
  total_leads          bigint,
  new_leads            bigint,
  assigned_leads       bigint,
  won_leads            bigint,
  lost_leads           bigint,
  stale_leads          bigint,
  pipeline_value_cents bigint
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'superadmin only' using errcode = 'insufficient_privilege';
  end if;

  return query
    select o.id, o.name,
           count(l.*),
           count(l.*) filter (where l.status = 'new'),
           count(l.*) filter (where l.status = 'assigned'),
           count(l.*) filter (where l.status = 'won'),
           count(l.*) filter (where l.status = 'lost'),
           count(l.*) filter (where l.is_stale),
           coalesce(sum(l.value_cents) filter (where l.status in ('new','assigned','won')), 0)
      from public.orgs o
      left join public.leads l on l.org_id = o.id
     group by o.id, o.name
     order by o.name;
end;
$$;

revoke all on function public.superadmin_org_rollup() from public;
grant execute on function public.superadmin_org_rollup() to authenticated;

-- ================= 20260716120004_cron =================
-- Scheduled job: nightly stale-lead sweep (pg_cron).

create extension if not exists pg_cron;

-- Flag 'new' leads whose SLA has already passed as stale, so neglected work
-- surfaces for reps and in the control plane. Returns how many it flagged.
create or replace function public.flag_stale_leads()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.leads
     set is_stale = true
   where status = 'new'
     and is_stale = false
     and sla_due_at is not null
     and sla_due_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Schedule it for 02:00 daily. Unschedule first so re-applying is idempotent.
do $$
begin
  perform cron.unschedule('flag-stale-leads');
exception when others then
  null;
end
$$;

select cron.schedule('flag-stale-leads', '0 2 * * *', $$select public.flag_stale_leads();$$);

-- ================= seed =================
-- Seed: two tenant orgs, an ops org for the superadmin, demo users, and leads.
-- Local dev only. Demo password for EVERY user: demopass123
-- pgcrypto lives in the `extensions` schema on Supabase, so call it qualified.

-- Orgs -----------------------------------------------------------------------
insert into public.orgs (id, slug, name) values
  ('10000000-0000-0000-0000-000000000001', 'ops',     'Field Ops HQ'),
  ('10000000-0000-0000-0000-000000000002', 'bluesky', 'BlueSky HVAC'),
  ('10000000-0000-0000-0000-000000000003', 'peak',    'Peak Plumbing');

-- Auth users -----------------------------------------------------------------
-- Insert directly into auth.users, with a matching auth.identities row so that
-- email/password login works against the local GoTrue.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', t.id, 'authenticated', 'authenticated',
  t.email, extensions.crypt('demopass123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, false,
  '', '', '', ''
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'super@ops.demo'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'ana@bluesky.demo'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'ben@bluesky.demo'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'pia@peak.demo')
) as t(id, email);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email in ('super@ops.demo','ana@bluesky.demo','ben@bluesky.demo','pia@peak.demo');

-- Profiles -------------------------------------------------------------------
insert into public.profiles (id, org_id, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sam Ops',   'superadmin'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Ana Reyes', 'admin'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Ben Cole',  'rep'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Pia Novak', 'admin');

-- Leads: BlueSky HVAC --------------------------------------------------------
insert into public.leads (org_id, customer_name, address, service_type, status, value_cents, assigned_to, source, sla_due_at) values
  ('10000000-0000-0000-0000-000000000002','Marla Hendricks','12 Oak St',  'HVAC',    'new',      480000, null,                                   'web',      now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000002','Trevor Lin',     '88 Pine Ave','HVAC',    'assigned', 260000, '00000000-0000-0000-0000-000000000003', 'manual',   now() + interval '1 day'),
  ('10000000-0000-0000-0000-000000000002','Priya Anand',    '5 Cedar Rd', 'Solar',   'won',     1200000, '00000000-0000-0000-0000-000000000003', 'referral', null),
  ('10000000-0000-0000-0000-000000000002','Dan Whitfield',  '23 Elm Ct',  'Plumbing','new',       90000, null,                                   'web',      now() - interval '5 hours');

-- Leads: Peak Plumbing -------------------------------------------------------
insert into public.leads (org_id, customer_name, address, service_type, status, value_cents, assigned_to, source, sla_due_at) values
  ('10000000-0000-0000-0000-000000000003','Grace Miller','410 Birch Blvd','Plumbing',  'new',  150000, null, 'web',   now() - interval '3 days'),
  ('10000000-0000-0000-0000-000000000003','Owen Park',   '77 Maple Dr',   'Plumbing',  'new',  320000, null, 'phone', now() + interval '2 days'),
  ('10000000-0000-0000-0000-000000000003','Nina Torres', '9 Spruce Ln',   'Electrical','lost',      0, null, 'web',   null);
