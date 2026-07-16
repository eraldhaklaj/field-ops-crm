# Deploy

Two pieces: the Supabase backend (hosted project) and the static front end. The anon
key and the hosted URL are public-by-design (RLS protects the data), so they are safe to
put in front-end env vars and in a committed `.env.production`.

## 1. Supabase backend

1. Create a free project at https://supabase.com/dashboard (pick a region near you, set
   and save a database password).

2. Authenticate the CLI and link the project (run from this repo root):

   ```bash
   npx supabase login          # opens a browser
   npx supabase link --project-ref <your-project-ref>   # ref is in the project URL
   ```

3. Apply the schema and seed the demo data. For a fresh throwaway demo project the
   simplest is a linked reset (this WIPES the hosted DB, only do it on the demo project):

   ```bash
   npx supabase db reset --linked
   ```

   (Safer alternative on a non-throwaway DB: `npx supabase db push` for migrations, then
   run `supabase/seed.sql` against the connection string yourself.)

4. Deploy the edge function and set its secret:

   ```bash
   npx supabase functions deploy lead-intake
   npx supabase secrets set INTAKE_WEBHOOK_SECRET=<a-strong-secret>
   ```

5. From the dashboard (Settings, API) copy the Project URL and the anon public key. You
   will need them for the front end.

## 2. Front end (Vercel or Netlify, no CLI needed)

Import the GitHub repo in Vercel or Netlify and set:

- Root directory / base: `web`
- Build command: `bun run build` (or `npm run build`)
- Publish / output directory: `dist`
- Environment variables:
  - `VITE_SUPABASE_URL` = your hosted project URL
  - `VITE_SUPABASE_ANON_KEY` = your hosted anon public key

Deploy. That URL is the live demo.

## Notes

- The demo seeds four users, all with password `demopass123`. For a public live demo
  that is fine; it is throwaway data behind RLS. Rotate or remove them if you prefer.
- After deploy, hit the webhook once so the "Webhook Wanda" style lead appears:

  ```bash
  curl -X POST <project-url>/functions/v1/lead-intake \
    -H "content-type: application/json" -H "x-webhook-secret: <your-secret>" \
    -d '{"org_slug":"peak","customer_name":"Website Lead","service_type":"Plumbing","value_cents":180000}'
  ```
