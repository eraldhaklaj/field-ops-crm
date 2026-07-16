import { useLeads, useOrgReps } from "@/hooks/queries";
import { Card } from "@/components/ui/card";
import { LeadsTable } from "@/components/LeadsTable";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import type { Org, Profile } from "@/lib/types";

export function LeadsView({
  profile,
  orgId,
  orgs,
}: {
  profile: Profile;
  orgId?: string;
  orgs?: Org[];
}) {
  const leads = useLeads(orgId);
  const reps = useOrgReps(orgId);
  const canManage = profile.role === "admin" || profile.role === "superadmin";
  const orgNameById = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">
            {orgId ? "Your pipeline" : "All tenants (superadmin view)"}
          </p>
        </div>
        {orgId && canManage && <NewLeadDialog orgId={orgId} />}
      </div>

      {leads.isLoading ? (
        <SkeletonRows />
      ) : leads.isError ? (
        <Card className="p-6 text-sm text-red-600">{(leads.error as Error).message}</Card>
      ) : (
        <LeadsTable
          leads={leads.data ?? []}
          reps={reps.data ?? []}
          canAssign={canManage && !!orgId}
          showOrg={!orgId}
          orgNameById={orgNameById}
        />
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <Card className="divide-y divide-slate-100">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </Card>
  );
}
