import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead, LeadStatus, Org, OrgRollup, Profile, ServiceType } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAD_SELECT = "*, assignee:profiles!leads_assigned_to_fkey(full_name)";

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, org_id, full_name, role")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

// Sort by value (biggest opportunities first), with id as a stable tiebreaker.
// Both are immutable, so marking a lead won/lost or assigning it never moves the
// row (unlike created_at, which is identical across the seed rows).
export function useLeads(orgId?: string) {
  return useQuery({
    queryKey: ["leads", orgId ?? "scope"],
    queryFn: async (): Promise<Lead[]> => {
      let q = supabase
        .from("leads")
        .select(LEAD_SELECT)
        .order("value_cents", { ascending: false })
        .order("id", { ascending: true });
      if (orgId) q = q.eq("org_id", orgId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Lead[];
    },
  });
}

export function useOrgReps(orgId: string | undefined) {
  return useQuery({
    queryKey: ["reps", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, org_id, full_name, role")
        .eq("org_id", orgId!)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useOrgs(enabled: boolean) {
  return useQuery({
    queryKey: ["orgs"],
    enabled,
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await supabase.from("orgs").select("*").order("name");
      if (error) throw error;
      return data as Org[];
    },
  });
}

export function useRollup(enabled: boolean) {
  return useQuery({
    queryKey: ["rollup"],
    enabled,
    queryFn: async (): Promise<OrgRollup[]> => {
      const { data, error } = await supabase.rpc("superadmin_org_rollup");
      if (error) throw error;
      return (data ?? []) as OrgRollup[];
    },
  });
}

export interface NewLeadInput {
  org_id: string;
  customer_name: string;
  address: string;
  service_type: ServiceType;
  value_cents: number;
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewLeadInput): Promise<Lead> => {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          org_id: input.org_id,
          customer_name: input.customer_name,
          address: input.address || null,
          service_type: input.service_type,
          value_cents: input.value_cents,
          source: "manual",
          sla_due_at: new Date(Date.now() + DAY_MS).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

// Patch every cached leads list in place, so a row updates without the list
// re-fetching and reordering under the user.
function patchLeadInCaches(
  qc: ReturnType<typeof useQueryClient>,
  leadId: string,
  patch: Partial<Lead>,
) {
  const snapshots = qc.getQueriesData<Lead[]>({ queryKey: ["leads"] });
  for (const [key, data] of snapshots) {
    if (!data) continue;
    qc.setQueryData<Lead[]>(
      key,
      data.map((l) => (l.id === leadId ? { ...l, ...patch } : l)),
    );
  }
  return snapshots;
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { leadId: string; status: LeadStatus }): Promise<Lead> => {
      const { data, error } = await supabase
        .from("leads")
        .update({ status: vars.status })
        .eq("id", vars.leadId)
        .select()
        .single();
      if (error) throw error;
      return data as Lead;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      return { snapshots: patchLeadInCaches(qc, vars.leadId, { status: vars.status }) };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      leadId: string;
      repId: string;
      repName: string;
    }): Promise<Lead> => {
      const { data, error } = await supabase.rpc("assign_lead", {
        p_lead_id: vars.leadId,
        p_rep_id: vars.repId,
      });
      if (error) throw error;
      return data as Lead;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const snapshots = qc.getQueriesData<Lead[]>({ queryKey: ["leads"] });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        qc.setQueryData<Lead[]>(
          key,
          data.map((l) =>
            l.id === vars.leadId
              ? {
                  ...l,
                  assigned_to: vars.repId,
                  assignee: { full_name: vars.repName },
                  status: l.status === "new" ? "assigned" : l.status,
                }
              : l,
          ),
        );
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
