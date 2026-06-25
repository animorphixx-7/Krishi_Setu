# Database Schema

All tables live in `public` with RLS enabled and explicit grants. Roles are
stored in `user_roles` and checked with `has_role(user_id, role)`.

## Core entities

```
profiles ──< bookings >── equipment
   │            │
   │            └─< reviews
   │
   ├─< crop_recommendations
   ├─< disease_scans
   ├─< ai_conversations ─< ai_messages
   ├─< farming_advice
   ├─< notifications
   └─< activity_logs            weather_cache (shared)
```

## Tables (selected)

### profiles
`id (uuid PK = auth.users.id)`, `full_name`, `phone`, `address`, `district`,
`role`, timestamps. Sensitive fields (`phone`, `address`) restricted to owner
and admins via RLS; safe view served via `get_safe_profile()`.

### user_roles
`user_id`, `role enum(farmer|equipment_owner|admin)`. Unique on `(user_id, role)`.
Read by `has_role()` security definer function.

### equipment
`name`, `category`, `description`, `price_per_day`, `district`, `image_url`,
`is_available`, `status`, `contact_number`, `owner_id`. `contact_number` is
not selectable directly; access through `get_owner_equipment_contact()` RPC.

### bookings
`equipment_id`, `user_id`, `start_date`, `end_date`, `total_price`, `status`.
`total_price` is recomputed server-side by `enforce_booking_total_price`
trigger to prevent tampering.

### crop_recommendations
`district`, `soil_type`, `farm_size`, `irrigation_type`, `season`,
`water_availability`, `inputs jsonb`, `recommendations jsonb`, `top_crop`.

### disease_scans
`image_url`, `plant_name`, `disease_name`, `health_status`, `confidence`,
`severity`, `language`, `diagnosis jsonb`.

### ai_conversations / ai_messages
Conversations have `title`, `language`, `last_message_at`. Messages have
`role`, `content`, `created_at`.

### farming_advice
`advice_type`, `crop`, `crop_stage`, `district`, `weather_snapshot`, `payload jsonb`.

### weather_cache
`location_key`, `lat`, `lon`, `payload jsonb`, `expires_at`. Served by
`cleanup_expired_weather_cache()` cron-friendly RPC.

### activity_logs
`user_id`, `event_type`, `description`, `ip_address`, `user_agent`,
`metadata jsonb`. Written by triggers + `log_auth_event` RPC. Readable by
owner or admin only.

## Functions / triggers
- `has_role(uuid, user_role)` — RLS helper.
- `handle_new_user()` — populates `profiles` + `user_roles` on signup.
- `enforce_booking_total_price()` — recomputes booking total.
- `notify_new_booking()` / `notify_booking_status_change()` — push to `notifications`.
- `log_user_event()` — generic audit trigger on inserts/updates.
- `log_auth_event(text, text)` — client-callable RPC for login/logout.
- `update_updated_at_column()` — generic `updated_at` trigger.
