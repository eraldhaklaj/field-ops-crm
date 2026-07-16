// lead-intake: public webhook that turns an inbound lead (website form, SMS
// gateway, partner feed) into a row in the correct tenant.
//
// Auth model, on purpose: this endpoint is public (verify_jwt = false), so it
// does NOT trust the caller's identity or any ambient header. It requires a
// shared webhook secret, then writes with the service role after resolving the
// tenant by slug. That keeps RLS intact for the app while giving unauthenticated
// intake one narrow, secret-gated path. A header that anyone could forge is
// exactly what this must not accept.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("INTAKE_WEBHOOK_SECRET") ?? "";

const SERVICE_TYPES = ["HVAC", "Plumbing", "Roofing", "Electrical", "Solar"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Length-constant comparison so a wrong secret can't be timed out char by char.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !safeEqual(provided, WEBHOOK_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const org_slug = String(payload.org_slug ?? "").trim();
  const customer_name = String(payload.customer_name ?? "").trim();
  if (!org_slug || !customer_name) {
    return json({ error: "org_slug and customer_name are required" }, 422);
  }

  let service_type = String(payload.service_type ?? "HVAC");
  if (!SERVICE_TYPES.includes(service_type)) service_type = "HVAC";

  const value_cents = Number.isFinite(Number(payload.value_cents))
    ? Math.max(0, Math.trunc(Number(payload.value_cents)))
    : 0;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Resolve the tenant by slug. Unknown slug is a 404, never a silent misfile.
  const { data: org, error: orgErr } = await admin
    .from("orgs").select("id").eq("slug", org_slug).maybeSingle();
  if (orgErr) return json({ error: "lookup failed", detail: orgErr.message }, 500);
  if (!org) return json({ error: `unknown org_slug '${org_slug}'` }, 404);

  const sla_due_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: lead, error: insErr } = await admin
    .from("leads")
    .insert({
      org_id: org.id,
      customer_name,
      address: payload.address ? String(payload.address) : null,
      service_type,
      value_cents,
      status: "new",
      source: payload.source ? String(payload.source) : "webhook",
      sla_due_at,
    })
    .select("id, org_id, customer_name, status, sla_due_at")
    .single();

  if (insErr) return json({ error: "insert failed", detail: insErr.message }, 500);
  return json({ ok: true, lead }, 201);
});
