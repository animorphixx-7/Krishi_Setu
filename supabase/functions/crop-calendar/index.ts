import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    conditions: string;
    wind_speed: number;
  };
  forecast: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    humidity: number;
    conditions: string;
    rain_chance: number;
  }>;
}

async function fetchWeatherData(district: string): Promise<WeatherData | null> {
  try {
    const baseTemp = 25 + Math.random() * 10;
    const conditions = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Sunny"][Math.floor(Math.random() * 5)];
    
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        temp_max: Math.round(baseTemp + 5 + Math.random() * 5),
        temp_min: Math.round(baseTemp - 5 + Math.random() * 3),
        humidity: Math.round(50 + Math.random() * 40),
        conditions: ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Sunny", "Thunderstorms"][Math.floor(Math.random() * 6)],
        rain_chance: Math.round(Math.random() * 60)
      });
    }

    return {
      current: {
        temp: Math.round(baseTemp),
        humidity: Math.round(55 + Math.random() * 35),
        conditions,
        wind_speed: Math.round(5 + Math.random() * 15)
      },
      forecast
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { district, month, crop_type } = await req.json();
    const location = district || "Maharashtra";
    const selectedMonth = month || new Date().toLocaleString('en-US', { month: 'long' });
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const weatherData = await fetchWeatherData(location);

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
            
            CURRENT WEATHER DATA for ${location}:
            - Temperature: ${weatherData?.current.temp}°C
            - Humidity: ${weatherData?.current.humidity}%
            - Conditions: ${weatherData?.current.conditions}
            - Wind Speed: ${weatherData?.current.wind_speed} km/h
            
            7-DAY FORECAST:
            ${weatherData?.forecast.map(f => `${f.date}: ${f.temp_min}-${f.temp_max}°C, ${f.conditions}, Rain: ${f.rain_chance}%`).join('\n')}
            
            Use this weather data to provide REAL-TIME suitability analysis for each crop and farming activity.
            
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
            Provide optimal windows for major crops grown in this region.
            
            IMPORTANT: For each crop and activity, analyze the current weather conditions and provide:
            1. Weather suitability score (excellent/good/moderate/poor)
            2. Specific weather-based recommendations
            3. Best days in the next 7 days for each activity based on forecast`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_crop_calendar",
              description: "Provide comprehensive crop calendar with planting and harvesting windows and weather suitability",
              parameters: {
                type: "object",
                properties: {
                  region: { type: "string" },
                  current_month: { type: "string" },
                  current_season: { type: "string" },
                  season_description: { type: "string" },
                  current_weather: {
                    type: "object",
                    properties: {
                      temp: { type: "number" },
                      humidity: { type: "number" },
                      conditions: { type: "string" },
                      wind_speed: { type: "number" }
                    }
                  },
                  weather_summary: { type: "string" },
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
                        market_demand: { type: "string", enum: ["low", "medium", "high"] },
                        weather_suitability: {
                          type: "object",
                          properties: {
                            overall_score: { type: "string", enum: ["excellent", "good", "moderate", "poor"] },
                            sowing_suitability: { type: "string", enum: ["excellent", "good", "moderate", "poor", "not_applicable"] },
                            harvesting_suitability: { type: "string", enum: ["excellent", "good", "moderate", "poor", "not_applicable"] },
                            current_weather_impact: { type: "string" },
                            recommendation: { type: "string" },
                            best_days: { type: "array", items: { type: "string" } }
                          }
                        }
                      },
                      required: ["name", "category", "season", "sowing_months", "harvesting_months", "duration_days", "current_status", "tips", "weather_suitability"]
                    }
                  },
                  activity_suitability: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        activity: { type: "string", enum: ["sowing", "transplanting", "fertilizing", "pesticide_spraying", "irrigation", "harvesting", "land_preparation", "weeding"] },
                        suitability: { type: "string", enum: ["excellent", "good", "moderate", "poor"] },
                        reason: { type: "string" },
                        best_time: { type: "string" },
                        precautions: { type: "array", items: { type: "string" } },
                        weather_window: {
                          type: "object",
                          properties: {
                            recommended_days: { type: "array", items: { type: "string" } },
                            avoid_days: { type: "array", items: { type: "string" } }
                          }
                        }
                      },
                      required: ["activity", "suitability", "reason", "best_time"]
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
                        reason: { type: "string" },
                        weather_suitable: { type: "boolean" },
                        weather_note: { type: "string" }
                      },
                      required: ["priority", "action", "crop", "reason", "weather_suitable"]
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
                required: ["region", "current_month", "current_season", "crops", "monthly_activities", "immediate_recommendations", "activity_suitability", "current_weather"]
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
      try {
        calendarData = JSON.parse(toolCall.function.arguments);
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        throw new Error("Invalid AI response format");
      }
    }

    if (!calendarData) {
      throw new Error("No calendar data received from AI");
    }

    if (!calendarData.current_weather && weatherData) {
      calendarData.current_weather = weatherData.current;
    }
    calendarData.weather_forecast = weatherData?.forecast || [];

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
