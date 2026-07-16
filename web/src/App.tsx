import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useOrgs, useProfile } from "@/hooks/queries";
import { Login } from "@/components/Login";
import { Header, type View } from "@/components/Header";
import { LeadsView } from "@/components/LeadsView";
import { ControlPlane } from "@/components/ControlPlane";
import { AppSkeleton } from "@/components/AppSkeleton";

export default function App() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const profile = useProfile(userId);
  const orgs = useOrgs(!!profile.data);
  const [view, setView] = useState<View>("leads");

  if (loading) return <Splash />;
  if (!session) return <Login />;
  if (profile.isLoading) return <AppSkeleton />;

  const p = profile.data;
  if (profile.isError || !p) {
    return <Centered>Could not load your profile.</Centered>;
  }

  const isSuper = p.role === "superadmin";
  const orgList = orgs.data ?? [];
  const orgName = orgList.find((o) => o.id === p.org_id)?.name ?? "";

  return (
    <div className="min-h-full">
      <Header profile={p} orgName={orgName} view={view} onView={setView} />
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        {isSuper && view === "control" ? (
          <ControlPlane profile={p} orgs={orgList} />
        ) : isSuper ? (
          <LeadsView profile={p} orgs={orgList} />
        ) : (
          <LeadsView profile={p} orgId={p.org_id} orgs={orgList} />
        )}
      </main>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
    </div>
  );
}

function Centered({ children }: { children: string }) {
  return (
    <div className="flex min-h-full items-center justify-center text-sm text-slate-500">
      {children}
    </div>
  );
}
