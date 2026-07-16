import { useState, type ReactNode } from "react";
import { useSession } from "@/hooks/useSession";
import { useOrgs, useProfile } from "@/hooks/queries";
import { Login } from "@/components/Login";
import { Header, type View } from "@/components/Header";
import { LeadsView } from "@/components/LeadsView";
import { ControlPlane } from "@/components/ControlPlane";

export default function App() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const profile = useProfile(userId);
  const orgs = useOrgs(!!profile.data);
  const [view, setView] = useState<View>("leads");

  if (loading) return <FullScreen>Loading…</FullScreen>;
  if (!session) return <Login />;
  if (profile.isLoading) return <FullScreen>Loading your profile…</FullScreen>;

  const p = profile.data;
  if (profile.isError || !p) return <FullScreen>Could not load your profile.</FullScreen>;

  const isSuper = p.role === "superadmin";
  const orgList = orgs.data ?? [];
  const orgName = orgList.find((o) => o.id === p.org_id)?.name ?? "";

  return (
    <div className="min-h-full">
      <Header profile={p} orgName={orgName} view={view} onView={setView} />
      <main className="mx-auto max-w-6xl px-6 py-6">
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

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center text-sm text-slate-500">{children}</div>
  );
}
