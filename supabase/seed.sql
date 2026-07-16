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
