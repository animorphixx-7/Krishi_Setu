# Testing Report

Manual verification matrix executed against the live preview:

| Area | Check | Status |
|---|---|---|
| Auth | Email signup → verify email → login | Pass |
| Auth | Google sign-in OAuth | Pass |
| Auth | Forgot/reset password | Pass |
| Auth | Logout → protected routes redirect | Pass |
| RBAC | Farmer cannot reach `/admin` | Pass |
| RBAC | Equipment insert blocked for non-owners | Pass (RLS) |
| Weather | Real Open-Meteo data, 7-day forecast, cached, stale fallback | Pass |
| Crop Recommendation | AI returns ranked crops, row inserted | Pass |
| Disease Detection | Upload → diagnosis → row inserted | Pass |
| AI Chat | Streaming SSE, history persisted, language switching | Pass |
| Advisor | Requires cached weather, structured JSON, history | Pass |
| Audit Logs | Login/logout/profile/scan/recommendation/chat/advice logged | Pass |
| Global Search | Returns users/recs/scans/chats/advice | Pass |
| Navigation | Bottom nav + navbar links, active-state, query-param safe | Pass |
| Accessibility | Tap targets ≥44px, aria-labels on icon buttons | Pass |
| Performance | LCP preloaded hero, WebP logo, lazy routes via Vite | Pass |
| Security | Booking price tamper-proof, contact_number hidden, RLS on all tables | Pass |
| TypeScript | `tsgo --noEmit` clean | Pass |
