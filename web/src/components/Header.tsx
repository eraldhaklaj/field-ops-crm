import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Building2, LayoutGrid, LogOut, Wrench } from "lucide-react";

export type View = "leads" | "control";

const ROLE_LABEL: Record<Profile["role"], string> = {
  rep: "Rep",
  admin: "Admin",
  superadmin: "Superadmin",
};

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
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Wrench className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-slate-900">Field Ops CRM</div>
            <div className="text-[11px] text-slate-500">{orgName}</div>
          </div>
        </div>

        {isSuper && (
          <nav className="flex items-center gap-0.5 rounded-lg bg-slate-100/80 p-0.5">
            <SegButton active={view === "leads"} onClick={() => onView("leads")} icon={<LayoutGrid className="h-4 w-4" />}>
              Leads
            </SegButton>
            <SegButton active={view === "control"} onClick={() => onView("control")} icon={<Building2 className="h-4 w-4" />}>
              Control plane
            </SegButton>
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3">
            <Avatar name={profile.full_name} className="h-7 w-7 text-[11px]" />
            <div className="hidden leading-tight sm:block">
              <div className="text-[13px] font-medium text-slate-800">{profile.full_name}</div>
              <div className="text-[11px] text-slate-500">{ROLE_LABEL[profile.role]}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="Sign out"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function SegButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all",
        active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
