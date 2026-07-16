import { useState } from "react";
import { useRollup } from "@/hooks/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { LeadsView } from "@/components/LeadsView";
import type { Org, Profile } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export function ControlPlane({ profile, orgs }: { profile: Profile; orgs: Org[] }) {
  const rollup = useRollup(true);
  const [drill, setDrill] = useState<{ id: string; name: string } | null>(null);

  if (drill) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setDrill(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to control plane
        </Button>
        <div className="text-sm text-slate-500">
          Viewing <span className="font-medium text-slate-800">{drill.name}</span> as superadmin
        </div>
        <LeadsView profile={profile} orgId={drill.id} orgs={orgs} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Control plane</h2>
        <p className="text-sm text-slate-500">
          Cross-tenant rollup from a superadmin-gated SECURITY DEFINER RPC.
        </p>
      </div>

      {rollup.isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-500">Loading rollup…</Card>
      ) : rollup.isError ? (
        <Card className="p-6 text-sm text-red-600">{(rollup.error as Error).message}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rollup.data ?? []).map((r) => (
            <Card key={r.org_id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{r.org_name}</CardTitle>
                {r.stale_leads > 0 && <Badge tone="red">{r.stale_leads} stale</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {formatMoney(r.pipeline_value_cents)}
                  </div>
                  <div className="text-xs text-slate-500">open pipeline</div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="new" value={r.new_leads} />
                  <Stat label="assigned" value={r.assigned_leads} />
                  <Stat label="won" value={r.won_leads} />
                  <Stat label="lost" value={r.lost_leads} />
                </div>
                <Button variant="subtle" size="sm" onClick={() => setDrill({ id: r.org_id, name: r.org_name })}>
                  View tenant
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 py-1.5">
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="text-slate-400">{label}</div>
    </div>
  );
}
