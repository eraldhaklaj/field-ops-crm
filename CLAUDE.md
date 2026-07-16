# CLAUDE.md — working in this repo

Guidance for Claude Code (and humans) working on this codebase.

## What this is

A multi-tenant field-sales CRM slice. Two halves:

- `supabase/` — Postgres schema, RLS, RPCs, a pg_cron job, and a Deno edge function.
- `web/` — a React 18 + Vite + TanStack Query + shadcn/Radix front end (bun).

## Conventions

- **Migrations are the source of truth.** Never hand-edit the running DB. Change a
  migration and run `npx supabase db reset`.
- **RLS is deny-by-default.** Every new table gets RLS enabled and explicit policies.
  Reads and writes are keyed to `auth_org_id()` / `is_superadmin()`. New tables also
  need base `GRANT`s to `authenticated` (and `service_role` if the edge function
  touches them), because this project does not rely on default privileges.
- **SECURITY DEFINER functions re-authorize the caller.** They run with elevated
  rights, so every one of them checks role/org inside the function body. Do not add a
  SECURITY DEFINER function that trusts RLS to gate it.
- **The webhook trusts a secret, not a header.** `lead-intake` authenticates with a
  shared secret and writes with the service role. Never trust a caller-supplied header
  (`cf-*`, `x-forwarded-*`) as an auth signal.
- **Front end:** data access goes through the hooks in `web/src/hooks/queries.ts`
  (TanStack Query). Components stay presentational. UI primitives live in
  `web/src/components/ui` in the shadcn idiom (cva + Radix + tailwind-merge).

## Verify before you trust

`scripts/verify.sql` impersonates each user role and asserts isolation, the RPC guards,
and the cron sweep. Run it after any change to the data layer. The front end has a
`bun run typecheck` gate (strict, no unused).

## How this was built with Claude Code

This repo was built AI-first, driving Claude Code rather than autocompleting:

- **Subagents** mapped the target stack and scaffolded the layers in parallel.
- **Verify, do not assume.** Every backend claim was checked against a live local
  Supabase (RLS isolation as two real users, the RPC guards, the cron sweep, the
  webhook) before moving on. Two real bugs surfaced this way, both missing GRANTs that
  RLS alone would have hidden, and were fixed in the migration.
- **The UI was smoke-tested in a real browser**, not assumed from a green build.

The lesson baked into the code: AI accelerates the work, but the human owns the
verification. That is why the auth model here is careful, not clever.
