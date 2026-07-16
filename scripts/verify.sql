-- Verification script: proves RLS isolation, the RPC guards, and the cron sweep.
-- Runs as the postgres role but impersonates each app user per-transaction via
--   set local request.jwt.claims  (drives auth.uid())
--   set local role authenticated  (so RLS actually applies)
-- Read tests roll back; the cron sweep is allowed to commit.

-- Capture the lead ids we need (as postgres, RLS bypassed) -------------------
select id as marla_id from public.leads where customer_name = 'Marla Hendricks' \gset
select id as dan_id   from public.leads where customer_name = 'Dan Whitfield'   \gset
select id as grace_id from public.leads where customer_name = 'Grace Miller'    \gset

\echo ''
\echo '==== 1. RLS READ ISOLATION ===================================='
\echo '-- Ben (rep, BlueSky) sees ONLY BlueSky leads  [expect 4, one org]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
  set local role authenticated;
  select count(*) as ben_sees from public.leads;
  select coalesce(string_agg(distinct o.name, ', '), '(none)') as ben_orgs
    from public.leads l join public.orgs o on o.id = l.org_id;
rollback;

\echo '-- Pia (admin, Peak) sees ONLY Peak leads       [expect 3]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
  set local role authenticated;
  select count(*) as pia_sees from public.leads;
rollback;

\echo '-- Sam (superadmin) sees ALL leads              [expect 7]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  set local role authenticated;
  select count(*) as sam_sees from public.leads;
rollback;

\echo '-- Cross-tenant probe: Ben explicitly queries Peak org  [expect 0]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
  set local role authenticated;
  select count(*) as ben_peak_rows from public.leads
   where org_id = '10000000-0000-0000-0000-000000000003';
rollback;

\echo ''
\echo '==== 2. assign_lead RPC (SECURITY DEFINER + in-function guards) ===='
\echo '-- Ana (admin, BlueSky) assigns a BlueSky lead to Ben   [expect status=assigned]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
  set local role authenticated;
  select (public.assign_lead(:'marla_id', '00000000-0000-0000-0000-000000000003')).status as new_status;
rollback;

\echo '-- Ben (rep, not admin) tries to assign             [expect ERROR: insufficient_privilege]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';
  set local role authenticated;
  select public.assign_lead(:'dan_id', '00000000-0000-0000-0000-000000000003');
rollback;

\echo '-- Pia (admin, Peak) tries to assign a BlueSky lead [expect ERROR: not authorized ... this org]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}';
  set local role authenticated;
  select public.assign_lead(:'marla_id', '00000000-0000-0000-0000-000000000003');
rollback;

\echo ''
\echo '==== 3. superadmin_org_rollup (cross-tenant, superadmin-gated) ===='
\echo '-- Sam (superadmin)                                  [expect 3 org rows]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  set local role authenticated;
  select org_name, total_leads, new_leads, won_leads, stale_leads, pipeline_value_cents
    from public.superadmin_org_rollup();
rollback;

\echo '-- Ana (admin, not superadmin)                       [expect ERROR: superadmin only]'
begin;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
  set local role authenticated;
  select * from public.superadmin_org_rollup();
rollback;

\echo ''
\echo '==== 4. flag_stale_leads() — the pg_cron job body ==============='
\echo '-- stale before  [expect 0]'
select count(*) filter (where is_stale) as stale_before from public.leads;
\echo '-- run the sweep [expect 3 flagged: Marla, Dan, Grace]'
select public.flag_stale_leads() as flagged;
\echo '-- stale after   [expect 3]'
select count(*) filter (where is_stale) as stale_after from public.leads;
\echo '-- cron job registered?'
select jobname, schedule, active from cron.job where jobname = 'flag-stale-leads';
