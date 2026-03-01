import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, language } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lang = language || "English";

    const systemPrompt = `You are an expert agricultural scientist and plant pathologist specializing in Indian crops. 
Analyze the uploaded crop/plant image and provide a diagnosis.

ALWAYS respond in valid JSON with this exact structure:
{
  "plant_name": "Name of the plant/crop identified",
  "health_status": "Healthy" or "Diseased",
  "disease_name": "Name of disease if any, or 'None'",
  "confidence": "High/Medium/Low",
  "symptoms": ["list", "of", "visible", "symptoms"],
  "causes": ["list", "of", "possible", "causes"],
  "treatment": [
    {"method": "treatment name", "description": "how to apply"},
  ],
  "prevention": ["list", "of", "prevention", "tips"],
  "organic_remedies": ["list", "of", "organic/home", "remedies"],
  "severity": "Mild/Moderate/Severe/None",
  "additional_notes": "Any extra advice for the farmer"
}

Be specific to Indian farming practices. Suggest locally available treatments and pesticides. If you cannot identify the plant or disease clearly, say so honestly and suggest the farmer consult a local agricultural officer.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this crop image and provide a detailed diagnosis. Respond in ${lang}.`,
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let diagnosis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      diagnosis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      diagnosis = null;
    }

    if (!diagnosis) {
      return new Response(
        JSON.stringify({ raw_response: content, error: "Could not parse structured diagnosis" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crop-doctor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
