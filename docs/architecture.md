# System Architecture

Krishi Setu AI is a React 18 + Vite SPA backed by Lovable Cloud (managed Postgres,
Auth, Storage, Edge Functions) and the Lovable AI Gateway (Gemini family).

```
                         ┌──────────────────────────────┐
                         │  Browser (PWA + bottom nav)  │
                         │  React 18 · Vite · Tailwind  │
                         │  shadcn/ui · TanStack Query  │
                         └──────────────┬───────────────┘
                                        │ HTTPS / WebSocket
                                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │                    Lovable Cloud (Supabase)               │
        │ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
        │ │   Auth     │ │  Storage   │ │      Postgres + RLS    │  │
        │ │ email +    │ │ equipment- │ │  profiles · bookings   │  │
        │ │ Google     │ │ images,    │ │  equipment · reviews   │  │
        │ │            │ │ forum-     │ │  crop_recommendations  │  │
        │ │            │ │ images     │ │  disease_scans · ai_*  │  │
        │ └────────────┘ └────────────┘ │  farming_advice        │  │
        │                               │  weather_cache         │  │
        │                               │  activity_logs · …     │  │
        │                               └────────────────────────┘  │
        │ ┌──────────────────────── Edge Functions ───────────────┐ │
        │ │ ai-chat (SSE) · farming-advisor · crop-recommendation │ │
        │ │ crop-doctor · fetch-weather-forecast · fetch-prices   │ │
        │ └───────────────────────────────────────────────────────┘ │
        └────────────────────────┬────────────────────────────┬─────┘
                                 ▼                            ▼
                    ┌──────────────────────┐    ┌────────────────────────┐
                    │ Lovable AI Gateway   │    │  Open-Meteo (weather)  │
                    │ Gemini 2.5/3 Flash   │    │  data.gov.in (APMC)    │
                    └──────────────────────┘    └────────────────────────┘
```

## Key principles
- **Row Level Security everywhere** — every public table has policies; helper
  functions are `SECURITY DEFINER` and explicitly granted.
- **Roles in a separate table** (`user_roles`) checked via `has_role()` to avoid
  recursive policies and privilege escalation.
- **Edge functions verify JWT in code** and use the service role only after
  authenticating the caller.
- **Caching** for weather (`weather_cache`, 1h TTL with stale fallback) to
  protect Open-Meteo quotas and improve LCP.
- **Audit trail** via triggers writing to `activity_logs` on key user actions,
  plus a `log_auth_event` RPC for login/logout.
