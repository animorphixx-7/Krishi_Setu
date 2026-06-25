import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_SOIL = ["black", "red", "alluvial", "sandy", "clay", "loamy", "laterite"];
const ALLOWED_SEASON = ["kharif", "rabi", "zaid", "summer"];
const ALLOWED_WATER = ["low", "medium", "high"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const location = String(body.location ?? "").trim().slice(0, 120);
    const soil = String(body.soil ?? "").toLowerCase().trim();
    const season = String(body.season ?? "").toLowerCase().trim();
    const water = String(body.water ?? "").toLowerCase().trim();
    const farmSize = Number(body.farmSize);
    const language = String(body.language ?? "English").slice(0, 30);

    const errors: string[] = [];
    if (!location) errors.push("location is required");
    if (!ALLOWED_SOIL.includes(soil)) errors.push("invalid soil type");
    if (!ALLOWED_SEASON.includes(season)) errors.push("invalid season");
    if (!ALLOWED_WATER.includes(water)) errors.push("invalid water availability");
    if (!Number.isFinite(farmSize) || farmSize <= 0 || farmSize > 10000) {
      errors.push("farmSize must be between 0 and 10000 acres");
    }
    if (errors.length) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert Indian agronomist advising Maharashtra farmers.
Recommend the 4 most suitable crops for the given conditions. Reply ONLY with valid JSON of this exact shape:
{
  "recommendations": [
    {
      "crop": "string",
      "variety": "string (optional regional variety)",
      "expected_yield": "string e.g. 18-22 quintals/acre",
      "water_requirement": "Low|Medium|High",
      "growing_duration_days": number,
      "profit_potential": "Low|Medium|High",
      "risk_level": "Low|Medium|High",
      "estimated_profit_per_acre_inr": "string e.g. ₹35,000-45,000",
      "reasoning": "1-2 sentence explanation tying soil, season, water, location to this crop"
    }
  ],
  "general_advice": "2-3 sentences of overall guidance"
}
Be specific to Indian conditions. No markdown, no text outside JSON.`;

    const userPrompt = `Location: ${location}
Soil type: ${soil}
Season: ${season}
Water availability: ${water}
Farm size: ${farmSize} acres
Respond in: ${language}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI recommendation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed: unknown = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return new Response(JSON.stringify({ raw_response: content, error: "Could not parse recommendations" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crop-recommendation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
