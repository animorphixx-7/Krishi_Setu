import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 8000;

interface ForecastDay {
  date: string;
  day_name: string;
  temp_high: number;
  temp_low: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  rain_chance: number;
  sunrise: string;
  sunset: string;
}

// WMO weather interpretation codes -> condition text
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)
function wmoToCondition(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain Showers";
  if ([85, 86].includes(code)) return "Snow Showers";
  if (code === 95) return "Thunderstorm";
  if ([96, 99].includes(code)) return "Thunderstorm with Hail";
  return "Unknown";
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function buildRecommendations(forecast: ForecastDay[]) {
  return forecast.map((day) => {
    const activities: Array<{
      activity: string;
      suitable: boolean;
      rating: "excellent" | "good" | "moderate" | "poor" | "avoid";
      reason: string;
      best_time?: string;
    }> = [];

    const rain = day.rain_chance;
    const wind = day.wind_speed;
    const humidity = day.humidity;
    const high = day.temp_high;
    const low = day.temp_low;

    // Sowing
    if (rain >= 30 && rain <= 70 && high >= 20 && high <= 32) {
      activities.push({
        activity: "Sowing",
        suitable: true,
        rating: "excellent",
        reason: `Moist soil expected (${rain}% rain) with ideal temperature ${low}-${high}°C.`,
        best_time: "Morning",
      });
    } else if (rain > 80 || high > 36) {
      activities.push({
        activity: "Sowing",
        suitable: false,
        rating: "poor",
        reason: rain > 80 ? "Heavy rain may waterlog seeds." : `High temperature ${high}°C stresses germination.`,
      });
    } else {
      activities.push({
        activity: "Sowing",
        suitable: true,
        rating: "moderate",
        reason: `Conditions are acceptable but not ideal (${rain}% rain, ${high}°C).`,
        best_time: "Early morning",
      });
    }

    // Pesticide spraying
    if (wind < 10 && rain < 20 && humidity >= 40 && humidity <= 80) {
      activities.push({
        activity: "Pesticide Spraying",
        suitable: true,
        rating: "excellent",
        reason: `Calm wind (${wind} km/h), low rain risk (${rain}%), good humidity (${humidity}%).`,
        best_time: "Early morning or late evening",
      });
    } else if (wind >= 15 || rain >= 50) {
      activities.push({
        activity: "Pesticide Spraying",
        suitable: false,
        rating: "avoid",
        reason: wind >= 15 ? `High wind (${wind} km/h) causes drift.` : `Rain (${rain}%) will wash off chemicals.`,
      });
    } else {
      activities.push({
        activity: "Pesticide Spraying",
        suitable: true,
        rating: "moderate",
        reason: `Acceptable conditions: wind ${wind} km/h, rain ${rain}%, humidity ${humidity}%.`,
        best_time: "Early morning",
      });
    }

    // Harvesting
    if (rain < 20 && humidity < 70) {
      activities.push({
        activity: "Harvesting",
        suitable: true,
        rating: "excellent",
        reason: `Dry conditions (${rain}% rain, ${humidity}% humidity) ideal for harvest.`,
        best_time: "Late morning to afternoon",
      });
    } else if (rain >= 60) {
      activities.push({
        activity: "Harvesting",
        suitable: false,
        rating: "avoid",
        reason: `Heavy rain expected (${rain}%) — grain quality at risk.`,
      });
    } else {
      activities.push({
        activity: "Harvesting",
        suitable: true,
        rating: "moderate",
        reason: `Mixed conditions (${rain}% rain, ${humidity}% humidity).`,
        best_time: "Afternoon",
      });
    }

    // Irrigation
    if (rain >= 50) {
      activities.push({
        activity: "Irrigation",
        suitable: false,
        rating: "avoid",
        reason: `Significant rain expected (${rain}%) — natural irrigation sufficient.`,
      });
    } else if (rain < 20 && high > 30) {
      activities.push({
        activity: "Irrigation",
        suitable: true,
        rating: "excellent",
        reason: `Hot (${high}°C) and dry (${rain}% rain) — crops need water.`,
        best_time: "Early morning or evening",
      });
    } else {
      activities.push({
        activity: "Irrigation",
        suitable: true,
        rating: "good",
        reason: `Standard irrigation recommended (${rain}% rain, ${high}°C).`,
        best_time: "Early morning",
      });
    }

    const overall_tip =
      rain >= 60
        ? "Wet day — postpone field operations, focus on drainage and storage."
        : rain < 20 && high > 32
        ? "Hot and dry — prioritize irrigation and avoid midday work."
        : "Balanced conditions — good day for routine farm operations.";

    return {
      date: day.date,
      day_name: day.day_name,
      activities,
      overall_tip,
    };
  });
}

function buildAlerts(forecast: ForecastDay[]) {
  const alerts: Array<{ type: string; severity: "info" | "warning" | "critical"; message: string }> = [];
  const heavyRain = forecast.find((d) => d.rain_chance >= 80);
  if (heavyRain) {
    alerts.push({
      type: "Heavy Rain",
      severity: "warning",
      message: `Heavy rain (${heavyRain.rain_chance}%) expected on ${heavyRain.day_name} (${heavyRain.date}). Protect harvested produce and ensure drainage.`,
    });
  }
  const extremeHeat = forecast.find((d) => d.temp_high >= 38);
  if (extremeHeat) {
    alerts.push({
      type: "Heat Wave",
      severity: "critical",
      message: `Extreme heat (${extremeHeat.temp_high}°C) on ${extremeHeat.day_name}. Increase irrigation and avoid midday outdoor work.`,
    });
  }
  const highWind = forecast.find((d) => d.wind_speed >= 25);
  if (highWind) {
    alerts.push({
      type: "High Wind",
      severity: "warning",
      message: `Strong winds (${highWind.wind_speed} km/h) on ${highWind.day_name}. Avoid spraying and secure structures.`,
    });
  }
  return alerts;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function geocode(city: string): Promise<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json&country=IN`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const json = await res.json();
  const r = json?.results?.[0];
  if (!r) return null;
  return { name: r.name, latitude: r.latitude, longitude: r.longitude, admin1: r.admin1, country: r.country };
}

async function fetchOpenMeteo(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Open-Meteo ${res.status}: ${body.slice(0, 200)}`);
  }
  return await res.json();
}

function normalize(om: any, locationLabel: string) {
  const current = {
    temperature: Math.round(om.current?.temperature_2m ?? 0),
    condition: wmoToCondition(om.current?.weather_code ?? -1),
    humidity: Math.round(om.current?.relative_humidity_2m ?? 0),
    wind_speed: Math.round(om.current?.wind_speed_10m ?? 0),
    visibility: Math.round(((om.current?.visibility ?? 0) as number) / 1000),
    feels_like: Math.round(om.current?.apparent_temperature ?? 0),
  };

  const dailyDates: string[] = om.daily?.time ?? [];
  const forecast: ForecastDay[] = dailyDates.map((date, i) => ({
    date,
    day_name: dayName(date),
    temp_high: Math.round(om.daily.temperature_2m_max[i]),
    temp_low: Math.round(om.daily.temperature_2m_min[i]),
    condition: wmoToCondition(om.daily.weather_code[i]),
    humidity: Math.round(om.daily.relative_humidity_2m_mean?.[i] ?? 0),
    wind_speed: Math.round(om.daily.wind_speed_10m_max?.[i] ?? 0),
    rain_chance: Math.round(om.daily.precipitation_probability_max?.[i] ?? 0),
    sunrise: om.daily.sunrise?.[i] ?? "",
    sunset: om.daily.sunset?.[i] ?? "",
  }));

  const farming_recommendations = buildRecommendations(forecast);
  const alerts = buildAlerts(forecast);

  const avgHigh = Math.round(forecast.reduce((s, d) => s + d.temp_high, 0) / forecast.length);
  const totalRainyDays = forecast.filter((d) => d.rain_chance >= 50).length;
  const weekly_summary =
    `Average daytime temperature around ${avgHigh}°C with ${totalRainyDays} day(s) of likely rain. ` +
    (totalRainyDays >= 3
      ? "Plan field operations around wet periods and ensure drainage."
      : totalRainyDays === 0
      ? "Dry week ahead — prioritize irrigation scheduling."
      : "Mixed week — balance irrigation with rain-day operations.");

  return {
    location: locationLabel,
    current,
    forecast,
    farming_recommendations,
    weekly_summary,
    alerts,
    source: "open-meteo",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { city, latitude, longitude } = body as {
      city?: string;
      latitude?: number;
      longitude?: number;
    };

    let locationLabel = city?.trim() || "";
    let lat: number | null = typeof latitude === "number" ? latitude : null;
    let lng: number | null = typeof longitude === "number" ? longitude : null;

    // Validate coords if provided
    if (lat !== null && (lat < -90 || lat > 90)) {
      return new Response(JSON.stringify({ error: "Invalid latitude" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
      return new Response(JSON.stringify({ error: "Invalid longitude" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve coordinates from city if needed
    if ((lat === null || lng === null) && locationLabel) {
      const geo = await geocode(locationLabel);
      if (!geo) {
        return new Response(
          JSON.stringify({ error: `Could not find location "${locationLabel}"` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      lat = geo.latitude;
      lng = geo.longitude;
      locationLabel = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ");
    }

    if (lat === null || lng === null) {
      return new Response(
        JSON.stringify({ error: "Provide either city or latitude/longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!locationLabel) {
      locationLabel = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    // Cache key: rounded to 2 decimals (~1km) to share across nearby requests
    const locationKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const now = new Date();

    // 1) Check cache
    const { data: cached } = await admin
      .from("weather_cache")
      .select("payload, fetched_at, expires_at")
      .eq("location_key", locationKey)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > now) {
      return new Response(
        JSON.stringify({
          success: true,
          data: cached.payload,
          cached: true,
          stale: false,
          fetched_at: cached.fetched_at,
          expires_at: cached.expires_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Try Open-Meteo
    try {
      const om = await fetchOpenMeteo(lat, lng);
      const data = normalize(om, locationLabel);
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);

      const { error: upsertError } = await admin
        .from("weather_cache")
        .upsert(
          {
            location_key: locationKey,
            latitude: lat,
            longitude: lng,
            payload: data,
            fetched_at: fetchedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: fetchedAt.toISOString(),
          },
          { onConflict: "location_key" },
        );
      if (upsertError) console.error("weather_cache upsert error:", upsertError);

      // Best-effort cleanup
      admin.rpc("cleanup_expired_weather_cache").then(({ error }) => {
        if (error) console.error("cleanup error:", error);
      });

      return new Response(
        JSON.stringify({
          success: true,
          data,
          cached: false,
          stale: false,
          fetched_at: fetchedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (apiError) {
      console.error("Open-Meteo fetch failed:", apiError);

      // 3) Serve stale cache if available
      if (cached) {
        return new Response(
          JSON.stringify({
            success: true,
            data: cached.payload,
            cached: true,
            stale: true,
            fetched_at: cached.fetched_at,
            expires_at: cached.expires_at,
            warning: "Live weather provider unavailable — showing last cached data.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          error: "Weather service is currently unavailable and no cached data exists for this location.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("fetch-weather-forecast error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
