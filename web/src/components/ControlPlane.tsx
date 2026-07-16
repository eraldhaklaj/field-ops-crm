import { useState } from "react";
import { useRollup } from "@/hooks/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { LeadsView } from "@/components/LeadsView";
import type { Org, OrgRollup, Profile } from "@/lib/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function ControlPlane({ profile, orgs }: { profile: Profile; orgs: Org[] }) {
  const rollup = useRollup(true);
  const [drill, setDrill] = useState<{ id: string; name: string } | null>(null);

  if (drill) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={() => setDrill(null)}>
            <ArrowLeft className="h-4 w-4" /> Control plane
          </Button>
          <p className="text-sm text-slate-500">
            Viewing <span className="font-medium text-slate-800">{drill.name}</span> as superadmin
          </p>
        </div>
        <LeadsView profile={profile} orgId={drill.id} orgs={orgs} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Control plane</h2>
        <p className="text-sm text-slate-500">
          Cross-tenant rollup from a superadmin-gated SECURITY DEFINER RPC.
        </p>
      </div>

      {rollup.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-slate-50/60" />
          ))}
        </div>
      ) : rollup.isError ? (
        <Card className="p-6 text-sm text-rose-600">{(rollup.error as Error).message}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rollup.data ?? []).map((r) => (
            <OrgCard key={r.org_id} r={r} onOpen={() => setDrill({ id: r.org_id, name: r.org_name })} />
          ))}
        </div>
      )}
    </div>
  );
}

const SEGMENTS: { key: keyof OrgRollup; color: string; label: string }[] = [
  { key: "new_leads", color: "bg-slate-300", label: "New" },
  { key: "assigned_leads", color: "bg-blue-400", label: "Assigned" },
  { key: "won_leads", color: "bg-emerald-400", label: "Won" },
  { key: "lost_leads", color: "bg-rose-300", label: "Lost" },
];

function OrgCard({ r, onOpen }: { r: OrgRollup; onOpen: () => void }) {
  const total = Math.max(1, r.total_leads);
  return (
    <Card className="flex flex-col transition-shadow hover:shadow-pop">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-[15px]">{r.org_name}</CardTitle>
        {r.stale_leads > 0 && <Badge tone="red" dot>{r.stale_leads} stale</Badge>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {formatMoney(r.pipeline_value_cents)}
          </div>
          <div className="text-xs text-slate-400">
            open pipeline · {r.total_leads} {r.total_leads === 1 ? "lead" : "leads"}
          </div>
        </div>

        {r.total_leads > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
              {SEGMENTS.map((seg) => {
                const v = r[seg.key] as number;
                return v > 0 ? (
                  <div key={seg.key} className={seg.color} style={{ width: `${(v / total) * 100}%` }} />
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {SEGMENTS.map((seg) => (
                <span key={seg.key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`} />
                  {seg.label}
                  <span className="font-medium tabular-nums text-slate-700">{r[seg.key] as number}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <Button variant="soft" size="sm" className="mt-auto justify-between" onClick={onOpen}>
          View tenant
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
