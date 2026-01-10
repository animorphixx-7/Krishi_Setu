import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { district, month, crop_type } = await req.json();
    const location = district || "Maharashtra";
    const selectedMonth = month || new Date().toLocaleString('en-US', { month: 'long' });
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert agricultural advisor for Indian farmers, specializing in crop calendars and seasonal planning.
            Provide accurate, region-specific crop calendar data for Maharashtra and surrounding areas.
            Consider:
            - Kharif season (June-October): Rice, Jowar, Bajra, Maize, Cotton, Soybean, Groundnut
            - Rabi season (October-March): Wheat, Gram, Mustard, Linseed, Sunflower
            - Zaid/Summer (March-June): Watermelon, Muskmelon, Cucumber, Vegetables
            - Perennial crops: Sugarcane, Banana, Papaya
            Include realistic sowing windows, harvesting periods, and weather dependencies.
            Return ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Generate a comprehensive crop calendar for ${location} region${crop_type ? ` focusing on ${crop_type} crops` : ''}.
            Include monthly recommendations with current focus on ${selectedMonth}.
            Provide optimal windows for major crops grown in this region.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_crop_calendar",
              description: "Provide comprehensive crop calendar with planting and harvesting windows",
              parameters: {
                type: "object",
                properties: {
                  region: { type: "string" },
                  current_month: { type: "string" },
                  current_season: { type: "string" },
                  season_description: { type: "string" },
                  crops: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        local_name: { type: "string" },
                        category: { type: "string", enum: ["cereal", "pulse", "oilseed", "cash_crop", "vegetable", "fruit"] },
                        season: { type: "string", enum: ["kharif", "rabi", "zaid", "perennial"] },
                        sowing_months: { type: "array", items: { type: "string" } },
                        harvesting_months: { type: "array", items: { type: "string" } },
                        duration_days: { type: "number" },
                        optimal_temp_min: { type: "number" },
                        optimal_temp_max: { type: "number" },
                        water_requirement: { type: "string", enum: ["low", "medium", "high"] },
                        soil_type: { type: "array", items: { type: "string" } },
                        current_status: { type: "string", enum: ["sowing_time", "growing", "harvesting_time", "off_season", "land_preparation"] },
                        tips: { type: "array", items: { type: "string" } },
                        market_demand: { type: "string", enum: ["low", "medium", "high"] }
                      },
                      required: ["name", "category", "season", "sowing_months", "harvesting_months", "duration_days", "current_status", "tips"]
                    }
                  },
                  monthly_activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "string" },
                        is_current: { type: "boolean" },
                        primary_activities: { type: "array", items: { type: "string" } },
                        crops_to_sow: { type: "array", items: { type: "string" } },
                        crops_to_harvest: { type: "array", items: { type: "string" } },
                        weather_considerations: { type: "string" },
                        irrigation_advice: { type: "string" }
                      },
                      required: ["month", "is_current", "primary_activities", "crops_to_sow", "crops_to_harvest"]
                    }
                  },
                  immediate_recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        action: { type: "string" },
                        crop: { type: "string" },
                        deadline: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["priority", "action", "crop", "reason"]
                    }
                  },
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        severity: { type: "string", enum: ["info", "warning", "critical"] },
                        message: { type: "string" }
                      }
                    }
                  }
                },
                required: ["region", "current_month", "current_season", "crops", "monthly_activities", "immediate_recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_crop_calendar" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse));

    let calendarData = null;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      calendarData = JSON.parse(toolCall.function.arguments);
    }

    if (!calendarData) {
      throw new Error("No calendar data received from AI");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: calendarData,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in crop-calendar:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
