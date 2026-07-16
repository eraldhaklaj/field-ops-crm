import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead, LeadStatus, Org, OrgRollup, Profile, ServiceType } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

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

// orgId undefined -> RLS returns whatever the caller may see (their org, or all
// orgs for a superadmin). orgId set -> a specific tenant (superadmin drilldown).
export function useLeads(orgId?: string) {
  return useQuery({
    queryKey: ["leads", orgId ?? "scope"],
    queryFn: async (): Promise<Lead[]> => {
      let q = supabase.from("leads").select("*").order("created_at", { ascending: true });
      if (orgId) q = q.eq("org_id", orgId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Lead[];
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

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { leadId: string; repId: string }): Promise<Lead> => {
      const { data, error } = await supabase.rpc("assign_lead", {
        p_lead_id: vars.leadId,
        p_rep_id: vars.repId,
      });
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
