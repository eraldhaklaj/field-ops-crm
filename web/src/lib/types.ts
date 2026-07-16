export type Role = "rep" | "admin" | "superadmin";
export type LeadStatus = "new" | "assigned" | "won" | "lost";
export type ServiceType = "HVAC" | "Plumbing" | "Roofing" | "Electrical" | "Solar";

export const SERVICE_TYPES: ServiceType[] = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Electrical",
  "Solar",
];

export interface Org {
  id: string;
  slug: string;
  name: string;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  role: Role;
}

export interface Lead {
  id: string;
  org_id: string;
  customer_name: string;
  address: string | null;
  service_type: ServiceType;
  status: LeadStatus;
  value_cents: number;
  assigned_to: string | null;
  source: string;
  sla_due_at: string | null;
  is_stale: boolean;
  created_at: string;
  // Embedded from profiles via the assigned_to FK (name only).
  assignee?: { full_name: string } | null;
}

export interface OrgRollup {
  org_id: string;
  org_name: string;
  total_leads: number;
  new_leads: number;
  assigned_leads: number;
  won_leads: number;
  lost_leads: number;
  stale_leads: number;
  pipeline_value_cents: number;
}
