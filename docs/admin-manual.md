# Admin Manual

The admin portal lives at `/admin` and is protected by `ProtectedRoute` with
an `admin` role check (`has_role(auth.uid(), 'admin')`).

## Tabs
- **Bookings Analytics** — revenue, status mix, category mix, monthly revenue,
  user-role pie. Computed from real bookings/equipment/profiles.
- **Platform Analytics** — KPIs (farmers, DAU, AI recommendations, disease
  scans, AI chats, advice requests, weather requests) plus daily logins, user
  growth, popular crops, most detected diseases, district-wise usage, module
  usage mix. Pulled from `activity_logs`, `crop_recommendations`,
  `disease_scans`, `ai_conversations`, `farming_advice`, `weather_cache`.
- **Audit Logs** — searchable + filterable feed from `activity_logs`
  (login/logout/profile update/scan/recommendation/chat/advice).
- **Search** — global search across users, recommendations, scans, chats,
  advice.
- **Equipment Approval / Manage Bookings** — moderation queues.

## Promoting a user to admin
Run in SQL editor:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<auth-user-id>', 'admin')
ON CONFLICT DO NOTHING;
```
