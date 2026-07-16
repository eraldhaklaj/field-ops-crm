import { useLeads, useOrgReps } from "@/hooks/queries";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsTable } from "@/components/LeadsTable";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { formatMoney } from "@/lib/utils";
import type { Lead, Org, Profile } from "@/lib/types";

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
  const rows = leads.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">
            {orgId ? "Your pipeline" : "Every tenant, superadmin view"}
          </p>
        </div>
        {orgId && canManage && <NewLeadDialog orgId={orgId} />}
      </div>

      {!leads.isLoading && !leads.isError && rows.length > 0 && <SummaryStrip leads={rows} />}

      {leads.isLoading ? (
        <SkeletonRows />
      ) : leads.isError ? (
        <Card className="p-6 text-sm text-rose-600">{(leads.error as Error).message}</Card>
      ) : (
        <LeadsTable
          leads={rows}
          reps={reps.data ?? []}
          canAssign={canManage && !!orgId}
          showOrg={!orgId}
          orgNameById={orgNameById}
        />
      )}
    </div>
  );
}

function SummaryStrip({ leads }: { leads: Lead[] }) {
  const open = leads.filter((l) => l.status === "new" || l.status === "assigned");
  const openValue = open.reduce((sum, l) => sum + l.value_cents, 0);
  const won = leads.filter((l) => l.status === "won").length;
  const stale = leads.filter((l) => l.is_stale).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total leads" value={String(leads.length)} />
      <Stat label="Open pipeline" value={formatMoney(openValue)} />
      <Stat label="Won" value={String(won)} accent="green" />
      <Stat label="Stale" value={String(stale)} accent={stale > 0 ? "red" : undefined} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  const color =
    accent === "green" ? "text-emerald-600" : accent === "red" ? "text-rose-600" : "text-slate-900";
  return (
    <Card className="px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{value}</div>
    </Card>
  );
}

function SkeletonRows() {
  return (
    <Card className="divide-y divide-slate-50 overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      ))}
    </Card>
  );
}
