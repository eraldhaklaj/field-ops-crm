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
