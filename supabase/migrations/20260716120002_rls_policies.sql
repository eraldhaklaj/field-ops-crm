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
