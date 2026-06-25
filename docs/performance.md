# Performance & Future Scope

## Performance
- **LCP**: hero served from `public/` with `<link rel="preload" fetchpriority="high">`,
  WebP logo, dimensions set to prevent CLS.
- **Network**: `preconnect`/`dns-prefetch` for font CDN + Supabase origin.
- **Data**: weather cached 1h, served stale on API failure. Edge functions use
  Gemini Flash for low latency.
- **Indexes**: `(user_id, created_at)` on AI tables, `location_key` and
  `expires_at` on `weather_cache`.
- **Bundle**: code-split routes via Vite; lucide-react tree-shaken; recharts
  loaded only on `/admin`.

## Future scope
- Stripe payments for equipment bookings (deferred per project rules).
- Push notifications (FCM) via the existing PWA shell.
- Mandi price predictions using historical APMC data.
- Offline-first sync for crop calendar and weather using IndexedDB.
- Mobile native shell via Capacitor.
- Multilingual TTS for low-literacy farmers.
