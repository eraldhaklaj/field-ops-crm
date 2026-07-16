import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const DEMO = [
  { email: "super@ops.demo", label: "Sam — superadmin (control plane)" },
  { email: "ana@bluesky.demo", label: "Ana — admin, BlueSky HVAC" },
  { email: "ben@bluesky.demo", label: "Ben — rep, BlueSky HVAC" },
  { email: "pia@peak.demo", label: "Pia — admin, Peak Plumbing" },
];
const DEMO_PASSWORD = "demopass123";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(withEmail: string, withPassword: string) {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: withEmail,
      password: withPassword,
    });
    if (error) setError(error.message);
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password);
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Field Ops CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Multi-tenant demo. Sign in with a demo account.</p>
        </div>
        <Card>
          <CardContent className="pt-5">
            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@org.demo"
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
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> one-click demo
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex flex-col gap-2">
              {DEMO.map((d) => (
                <Button
                  key={d.email}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  disabled={busy}
                  onClick={() => void signIn(d.email, DEMO_PASSWORD)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-400">
          Every demo account uses the password demopass123
        </p>
      </div>
    </div>
  );
}
