import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Wrench, ChevronRight } from "lucide-react";

const DEMO = [
  { email: "super@ops.demo", name: "Sam Ops", hint: "Superadmin · control plane" },
  { email: "ana@bluesky.demo", name: "Ana Reyes", hint: "Admin · BlueSky HVAC" },
  { email: "ben@bluesky.demo", name: "Ben Cole", hint: "Rep · BlueSky HVAC" },
  { email: "pia@peak.demo", name: "Pia Novak", hint: "Admin · Peak Plumbing" },
];
const DEMO_PASSWORD = "demopass123";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function signIn(withEmail: string, withPassword: string, key: string) {
    setBusy(key);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: withEmail,
      password: withPassword,
    });
    if (error) {
      setError(error.message);
      setBusy(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password, "form");
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Wrench className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Field Ops CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Multi-tenant demo. Pick a role to explore.</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <form className="flex flex-col gap-3.5" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@org.demo"
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demopass123"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-inset ring-rose-100">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy !== null}>
              {busy === "form" ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              or one-click demo
            </span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="flex flex-col gap-1.5">
            {DEMO.map((d) => (
              <button
                key={d.email}
                disabled={busy !== null}
                onClick={() => void signIn(d.email, DEMO_PASSWORD, d.email)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200/80 px-3 py-2 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40 disabled:opacity-60"
              >
                <Avatar name={d.name} className="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] font-medium text-slate-800">{d.name}</div>
                  <div className="truncate text-[11px] text-slate-500">{d.hint}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Every demo account uses the password <span className="font-medium text-slate-500">demopass123</span>
        </p>
      </div>
    </div>
  );
}
