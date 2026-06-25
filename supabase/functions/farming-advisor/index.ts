// AI Farming Advisor — generates structured advice grounded in real weather + profile + crop stage.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = ["daily", "weekly", "irrigation", "fertilizer", "pest", "harvest"] as const;
type AdviceType = typeof ALLOWED_TYPES[number];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authErr } = await authClient.auth.getUser();
  if (authErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const user = userData.user;

  try {
    const body = await req.json();
    const advice_type: AdviceType = ALLOWED_TYPES.includes(body.advice_type) ? body.advice_type : "daily";
    const crop: string = String(body.crop || "").trim().slice(0, 60);
    const crop_stage: string = String(body.crop_stage || "").trim().slice(0, 60);
    const language: string = ["English", "Hindi", "Marathi"].includes(body.language) ? body.language : "English";

    const [{ data: profile }, { data: latestWeather }, { data: lastRec }] = await Promise.all([
      admin.from("profiles").select("full_name,district").eq("id", user.id).maybeSingle(),
      admin.from("weather_cache").select("payload,fetched_at").order("fetched_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("crop_recommendations").select("top_crop,recommendations,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!latestWeather?.payload) {
      return new Response(JSON.stringify({
        error: "No weather data available yet. Open the Weather page to load forecast for your district first.",
      }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const weather = latestWeather.payload;
    const langInstruction = language === "Hindi"
      ? "Respond in Hindi (Devanagari)."
      : language === "Marathi"
      ? "Respond in Marathi (Devanagari)."
      : "Respond in clear English.";

    const sys = `You are an expert Indian agriculture advisor for ${profile?.district || "Maharashtra"}.
${langInstruction}

Use ONLY the real weather and profile data provided. Do NOT invent forecast numbers, prices, or scheme info.
Return STRICT JSON matching this schema:
{
  "summary": string,
  "items": [
    { "title": string, "action": string, "why": string, "priority": "high"|"medium"|"low", "timing": string }
  ],
  "warnings": [string]
}
Every "items[].why" must reference a real observation (e.g. "rain probability 75% on Thursday", "temp 36°C", "wind 22 km/h"). 4-7 items.`;

    const userPrompt = `Advice type: ${advice_type}
Crop: ${crop || (lastRec?.top_crop ?? "general")}
Crop stage: ${crop_stage || "unspecified"}
District: ${profile?.district || "unknown"}

REAL WEATHER (JSON, truncated):
${JSON.stringify({
  location: weather.location,
  current: weather.current,
  forecast: weather.forecast,
  alerts: weather.alerts,
}).slice(0, 3500)}

PREVIOUS RECOMMENDATION (if any):
${lastRec ? JSON.stringify({ top_crop: lastRec.top_crop, when: lastRec.created_at }) : "none"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("advisor AI error:", aiRes.status, t);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
    if (!parsed?.items || !Array.isArray(parsed.items)) {
      return new Response(JSON.stringify({ error: "AI returned invalid format. Please retry." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const weatherSnapshot = {
      location: weather.location,
      current: weather.current,
      forecast_summary: (weather.forecast || []).slice(0, 7).map((d: any) => ({
        date: d.date, high: d.temp_high, low: d.temp_low, rain: d.rain_chance, condition: d.condition,
      })),
    };

    const { data: saved, error: insErr } = await admin.from("farming_advice").insert({
      user_id: user.id,
      advice_type, crop: crop || null, crop_stage: crop_stage || null,
      district: profile?.district || null,
      weather_snapshot: weatherSnapshot,
      payload: parsed,
    }).select("id, created_at").single();
    if (insErr) console.error("save advice error:", insErr);

    return new Response(JSON.stringify({
      success: true,
      id: saved?.id,
      created_at: saved?.created_at,
      advice: parsed,
      weather_snapshot: weatherSnapshot,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("farming-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
