# Field-sales CRM slice — multi-tenant, Supabase, built with Claude Code

**Live demo:** https://eraldhaklaj.github.io/field-ops-crm/ (sign in with a one-click demo account)

A small but fully working slice of a multi-tenant field-sales / home-services CRM,
plus a super-admin control plane. Every layer is wired end to end and verified against
a live stack, nothing is mocked.

- **Front end:** React 18, Vite, TypeScript, TanStack Query, shadcn/Radix, Tailwind, bun.
- **Back end:** Supabase Postgres with row-level-security tenant isolation, a versioned
  migration, two `SECURITY DEFINER` RPCs with in-function authorization, a `pg_cron`
  scheduled job, and a Deno edge function for public lead intake.
- **Built with:** Claude Code, driven with subagents. See `CLAUDE.md`.

## What it demonstrates

| Requirement | Where it lives |
| --- | --- |
| Multi-tenant data isolation | RLS policies in `supabase/migrations`, proven with two real users |
| Postgres schema + migrations | `supabase/migrations/2026*_init_schema.sql` |
| RLS in depth | tenant + role policies, plus a role-escalation guard on `profiles` |
| SECURITY DEFINER RPCs | `assign_lead()` and `superadmin_org_rollup()`, each re-checks the caller |
| Scheduled jobs | `pg_cron` nightly stale-lead sweep (`flag_stale_leads()`) |
| Deno edge functions | `supabase/functions/lead-intake` (shared-secret webhook) |
| React 18 + TanStack Query + shadcn | `web/` |
| Super-admin control plane | cross-tenant rollup + per-tenant drilldown (superadmin only) |

## Architecture in one paragraph

Three tenants (`orgs`), users (`profiles`) that carry an `org_id` and a role
(`rep` / `admin` / `superadmin`), and `leads` as the core entity. RLS keys every read
and write to the caller's org via a `SECURITY DEFINER` helper (`auth_org_id()`) that
reads `profiles` without recursing into its own policy. A superadmin sees across all
tenants. Assigning a lead and the cross-tenant rollup are RPCs that run with elevated
rights and therefore re-authorize the caller inside the function. Inbound leads from a
website form or SMS gateway hit a Deno edge function that authenticates with a shared
secret and writes with the service role after resolving the tenant by slug.

## Run it locally

Prereqs: Docker, [bun](https://bun.sh), and the Supabase CLI (bundled here as a dev
dependency, so `npx supabase ...` works with no global install).

```bash
# 1. Start Postgres + Auth + REST and apply migrations + seed (two tenants, demo users)
npx supabase start
npx supabase db reset

# 2. (optional) serve the lead-intake webhook in another terminal
cp supabase/functions/.env.example supabase/functions/.env   # set INTAKE_WEBHOOK_SECRET
npx supabase functions serve --env-file supabase/functions/.env

# 3. Run the web app
cd web
cp .env.example .env.local        # paste the anon key printed by `supabase start`
bun install
bun run dev                       # http://localhost:5173
```

Sign in with any demo account (password `demopass123`):

| Email | Role | Tenant |
| --- | --- | --- |
| `super@ops.demo` | superadmin | sees the control plane + all tenants |
| `ana@bluesky.demo` | admin | BlueSky HVAC |
| `ben@bluesky.demo` | rep | BlueSky HVAC |
| `pia@peak.demo` | admin | Peak Plumbing |

## Verify the backend

`scripts/verify.sql` impersonates each user and checks tenant isolation, the RPC
guards, and the cron sweep. Against the running local DB:

```bash
docker exec -i supabase_db_artifact-fieldsales-crm \
  psql -U postgres -d postgres -q < scripts/verify.sql
```

Try the webhook (returns 201 and lands the lead in the right tenant):

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/lead-intake \
  -H "content-type: application/json" -H "x-webhook-secret: demo-intake-secret-123" \
  -d '{"org_slug":"peak","customer_name":"Website Lead","service_type":"Plumbing","value_cents":180000}'
```

## Notes

This is a focused demo, not a product. It leaves out what a real build would add next:
tests (pgTAP + Vitest/Playwright), CI, optimistic UI, pagination, and rate-limiting on
the public webhook. The point is to show the multi-tenant Supabase core done correctly.
