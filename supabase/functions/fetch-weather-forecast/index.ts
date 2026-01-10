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
    const { city, district } = await req.json();
    const location = city || district || "Pune";
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

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
            content: `You are an agricultural weather advisor for farmers in India. 
            Provide realistic 7-day weather forecasts and farming activity recommendations.
            Consider Indian agricultural practices and seasonal patterns.
            Base recommendations on actual weather science for farming:
            - Sowing: Ideal in moist soil after light rain, temps 20-30°C, low wind
            - Pesticide spraying: Best in calm weather (wind <10km/h), no rain expected for 24hrs, humidity 40-80%
            - Harvesting: Dry conditions, low humidity, sunny weather preferred
            - Irrigation: Reduce if rain expected, increase in dry spells
            - Fertilizer application: Before expected rain (for absorption), not during heavy rain
            - Transplanting: Cloudy days or evening, moist soil
            Return ONLY valid JSON with no markdown.`
          },
          {
            role: "user",
            content: `Generate a detailed 7-day weather forecast for ${location}, India starting from ${dateStr}.
            Include realistic weather data and specific farming recommendations for each day.
            Return JSON with this exact structure.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_weather_forecast",
              description: "Provide 7-day weather forecast with farming recommendations",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string" },
                  current: {
                    type: "object",
                    properties: {
                      temperature: { type: "number" },
                      condition: { type: "string" },
                      humidity: { type: "number" },
                      wind_speed: { type: "number" },
                      visibility: { type: "number" },
                      feels_like: { type: "number" },
                      uv_index: { type: "number" }
                    },
                    required: ["temperature", "condition", "humidity", "wind_speed", "visibility"]
                  },
                  forecast: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        day_name: { type: "string" },
                        temp_high: { type: "number" },
                        temp_low: { type: "number" },
                        condition: { type: "string" },
                        humidity: { type: "number" },
                        wind_speed: { type: "number" },
                        rain_chance: { type: "number" },
                        sunrise: { type: "string" },
                        sunset: { type: "string" }
                      },
                      required: ["date", "day_name", "temp_high", "temp_low", "condition", "humidity", "wind_speed", "rain_chance"]
                    }
                  },
                  farming_recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        day_name: { type: "string" },
                        activities: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              activity: { type: "string" },
                              suitable: { type: "boolean" },
                              rating: { type: "string", enum: ["excellent", "good", "moderate", "poor", "avoid"] },
                              reason: { type: "string" },
                              best_time: { type: "string" }
                            },
                            required: ["activity", "suitable", "rating", "reason"]
                          }
                        },
                        overall_tip: { type: "string" }
                      },
                      required: ["date", "day_name", "activities", "overall_tip"]
                    }
                  },
                  weekly_summary: { type: "string" },
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
                required: ["location", "current", "forecast", "farming_recommendations", "weekly_summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_weather_forecast" } }
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

    // Extract weather data from tool call
    let weatherData = null;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      weatherData = JSON.parse(toolCall.function.arguments);
    }

    if (!weatherData) {
      throw new Error("No weather data received from AI");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: weatherData,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-weather-forecast:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
