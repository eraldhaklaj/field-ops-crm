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
