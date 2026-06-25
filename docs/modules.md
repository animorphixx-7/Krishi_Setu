# Modules

| Route | Module | Notes |
|---|---|---|
| `/` | Home / dashboard | Quick actions, hero |
| `/auth` | Sign-in / sign-up | Email + Google, forgot/reset password |
| `/profile` | Farmer profile | Editable; updates audit-logged |
| `/equipment`, `/equipment/:id` | Marketplace | Browse + book |
| `/my-equipment`, `/my-bookings` | Owner/farmer dashboards | Lifecycle |
| `/weather` | Weather | Real Open-Meteo data, cached, skeletons, stale-banner |
| `/crop-recommendation` | AI crop engine | Persists history |
| `/crop-doctor` | AI disease scan | Persists `disease_scans` |
| `/farming-advisor` | Structured AI advice | Requires real cached weather |
| `/ai-chat` | Multilingual chat | Streaming, conversation history |
| `/community` | Forum | Posts, comments, likes |
| `/government-schemes` | Schemes | Eligibility checker |
| `/market-prices` | APMC prices | District filter |
| `/notifications` | Bell + center | Real-time |
| `/admin` | Admin portal | Tabs: Bookings analytics, Platform analytics, Audit logs, Search, Equipment approval, Bookings management |
