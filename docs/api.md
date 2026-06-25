# Edge Functions

All functions live under `supabase/functions/<name>/index.ts`, deploy with
`verify_jwt = false`, and authenticate in-code via `auth.getUser(token)`.
CORS headers are emitted on every response. Errors are returned with
explicit status codes (`401`, `402`, `412`, `429`, `502`).

| Function | Purpose | Inputs | Output |
|---|---|---|---|
| `ai-chat` | Streaming multilingual chat grounded in profile, weather, prices | `{ conversation_id?, message, language }` | SSE stream + persisted to `ai_messages` |
| `farming-advisor` | Structured daily/weekly advice grounded in cached weather | `{ advice_type, crop, crop_stage, language }` | JSON `{summary, items[], warnings[]}` + row in `farming_advice` |
| `crop-recommendation` | AI crop suggestions | `{ location, soil, season, water, farmSize }` | JSON array `recommendations[]` |
| `crop-doctor` | Plant disease detection from image | `{ image_base64, language }` | JSON diagnosis |
| `fetch-weather-forecast` | Real-time + cached 7-day forecast | `{ location }` | Forecast JSON (Open-Meteo) |
| `fetch-market-prices` | APMC market prices | `{ commodity?, district? }` | Price rows |

## Conventions
- Always 400 on invalid input (Zod-validated).
- Use Lovable AI Gateway (`google/gemini-2.5-flash` for cheap structured calls,
  `gemini-3-flash` for chat).
- Cache external data (`weather_cache`) and serve stale on upstream failure.
