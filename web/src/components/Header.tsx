import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";
import { Building2, LayoutGrid, LogOut } from "lucide-react";

export type View = "leads" | "control";

export function Header({
  profile,
  orgName,
  view,
  onView,
}: {
  profile: Profile;
  orgName: string;
  view: View;
  onView: (v: View) => void;
}) {
  const isSuper = profile.role === "superadmin";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            FO
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Field Ops CRM</div>
            <div className="text-xs text-slate-500">{orgName}</div>
          </div>
        </div>

        {isSuper && (
          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button onClick={() => onView("leads")} className={navCls(view === "leads")}>
              <LayoutGrid className="h-4 w-4" /> Leads
            </button>
            <button onClick={() => onView("control")} className={navCls(view === "control")}>
              <Building2 className="h-4 w-4" /> Control plane
            </button>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-800">{profile.full_name}</div>
            <Badge tone={isSuper ? "amber" : profile.role === "admin" ? "blue" : "slate"}>
              {profile.role}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" title="Sign out" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function navCls(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
  }`;
}
