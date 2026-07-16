import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn, dueInfo, formatMoney } from "@/lib/utils";
import type { Lead, LeadStatus, Profile } from "@/lib/types";
import { useAssignLead, useUpdateLeadStatus } from "@/hooks/queries";
import { Clock, TriangleAlert, UserPlus2, Inbox } from "lucide-react";

const STATUS: Record<LeadStatus, { tone: BadgeProps["tone"]; label: string }> = {
  new: { tone: "slate", label: "New" },
  assigned: { tone: "blue", label: "Assigned" },
  won: { tone: "green", label: "Won" },
  lost: { tone: "red", label: "Lost" },
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
  const assignable = reps.filter((r) => r.role === "rep" || r.role === "admin");

  if (leads.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-700">No leads yet</p>
        <p className="text-sm text-slate-400">New leads will appear here.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <th className="px-5 py-2.5 font-medium">Customer</th>
              {showOrg && <th className="px-4 py-2.5 font-medium">Tenant</th>}
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              <th className="px-4 py-2.5 font-medium">SLA</th>
              <th className="px-4 py-2.5 font-medium">Owner</th>
              <th className="px-5 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const s = STATUS[lead.status];
              const open = lead.status === "new" || lead.status === "assigned";
              return (
                <tr
                  key={lead.id}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{lead.customer_name}</div>
                    {lead.address && <div className="text-xs text-slate-400">{lead.address}</div>}
                  </td>
                  {showOrg && (
                    <td className="px-4 py-3 text-slate-500">{orgNameById[lead.org_id] ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{lead.service_type}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.tone} dot>
                      {s.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {formatMoney(lead.value_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <SlaCell lead={lead} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.assignee?.full_name ? (
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <Avatar name={lead.assignee.full_name} className="h-5 w-5 text-[9px]" />
                        <span className="text-[13px]">{lead.assignee.full_name}</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {canAssign && open && assignable.length > 0 && (
                        <Select
                          value={lead.assigned_to ?? ""}
                          onValueChange={(repId) => {
                            const rep = assignable.find((r) => r.id === repId);
                            if (rep)
                              assign.mutate({
                                leadId: lead.id,
                                repId,
                                repName: rep.full_name,
                              });
                          }}
                        >
                          <SelectTrigger
                            className="h-7 gap-1.5 px-2 text-xs"
                            aria-label="Assign owner"
                          >
                            <UserPlus2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{lead.assigned_to ? "Reassign" : "Assign"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {assignable.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {open ? (
                        <>
                          <Button
                            variant="win"
                            size="xs"
                            onClick={() => updateStatus.mutate({ leadId: lead.id, status: "won" })}
                          >
                            Won
                          </Button>
                          <Button
                            variant="lose"
                            size="xs"
                            onClick={() => updateStatus.mutate({ leadId: lead.id, status: "lost" })}
                          >
                            Lost
                          </Button>
                        </>
                      ) : (
                        <span className="pr-1 text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SlaCell({ lead }: { lead: Lead }) {
  if (lead.is_stale) {
    return (
      <Badge tone="red" dot>
        <TriangleAlert className="h-3 w-3" />
        Stale
      </Badge>
    );
  }
  const d = dueInfo(lead.sla_due_at);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        d.overdue ? "font-medium text-amber-600" : "text-slate-400",
      )}
    >
      <Clock className="h-3 w-3" />
      {d.label}
    </span>
  );
}
