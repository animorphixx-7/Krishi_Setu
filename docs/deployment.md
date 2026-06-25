# Installation & Deployment

## Local development
```bash
bun install
bun run dev    # http://localhost:8080
```

Environment variables (auto-managed by Lovable Cloud):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Production deployment
1. Click **Publish** in Lovable. The build runs on Lovable infra and uploads
   the static SPA + edge functions.
2. Edge function secrets (`LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are
   provisioned automatically.
3. Database migrations are applied through Lovable's migration flow and require
   explicit approval before running.
4. Custom domain: Project Settings → Domains.

## PWA install
The site exposes `/manifest.json` and mobile meta tags; installable on iOS
(Add to Home Screen) and Android (Install app prompt).
