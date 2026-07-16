import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, relativeDue } from "@/lib/utils";
import type { Lead, LeadStatus, Profile } from "@/lib/types";
import { useAssignLead, useUpdateLeadStatus } from "@/hooks/queries";
import { AlertTriangle } from "lucide-react";

const STATUS_TONE: Record<LeadStatus, "slate" | "blue" | "green" | "red"> = {
  new: "slate",
  assigned: "blue",
  won: "green",
  lost: "red",
};

export function LeadsTable({
  leads,
  reps,
  canAssign,
  showOrg,
  orgNameById,
}: {
  leads: Lead[];
  reps: Profile[];
  canAssign: boolean;
  showOrg: boolean;
  orgNameById: Record<string, string>;
}) {
  const assign = useAssignLead();
  const updateStatus = useUpdateLeadStatus();
  const repName = (id: string | null) =>
    reps.find((r) => r.id === id)?.full_name ?? (id ? "assigned" : "unassigned");

  if (leads.length === 0) {
    return <Card className="p-8 text-center text-sm text-slate-500">No leads yet.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              {showOrg && <th className="px-4 py-2.5 font-medium">Tenant</th>}
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Value</th>
              <th className="px-4 py-2.5 font-medium">SLA</th>
              <th className="px-4 py-2.5 font-medium">Rep</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{lead.customer_name}</div>
                  {lead.address && <div className="text-xs text-slate-400">{lead.address}</div>}
                </td>
                {showOrg && (
                  <td className="px-4 py-3 text-slate-600">{orgNameById[lead.org_id] ?? "—"}</td>
                )}
                <td className="px-4 py-3 text-slate-600">{lead.service_type}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatMoney(lead.value_cents)}</td>
                <td className="px-4 py-3">
                  {lead.is_stale ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> stale
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">{relativeDue(lead.sla_due_at)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{repName(lead.assigned_to)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {canAssign &&
                      (lead.status === "new" || lead.status === "assigned") &&
                      reps.length > 0 && (
                        <Select
                          value={lead.assigned_to ?? ""}
                          onValueChange={(repId) => assign.mutate({ leadId: lead.id, repId })}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Assign rep" />
                          </SelectTrigger>
                          <SelectContent>
                            {reps
                              .filter((r) => r.role === "rep" || r.role === "admin")
                              .map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    {lead.status !== "won" && lead.status !== "lost" && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => updateStatus.mutate({ leadId: lead.id, status: "won" })}
                        >
                          Won
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ leadId: lead.id, status: "lost" })}
                        >
                          Lost
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
