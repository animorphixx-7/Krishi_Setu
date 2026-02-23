import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user and check admin role
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

    const userId = claimsData.claims.sub;

    // Check admin role - this function deletes and regenerates all market data
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Lovable AI to get current market prices
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
            content: `You are a market price data provider for agricultural commodities in India. 
            Provide realistic current market prices for major crops in Maharashtra's APMC markets.
            Return ONLY a valid JSON array with no markdown formatting.
            Each item must have: crop_name, price_per_quintal (number), market_name, district.
            Include at least 15-20 commodities like Rice, Wheat, Jowar, Bajra, Maize, Tur Dal, Moong Dal, Urad Dal, 
            Chana, Groundnut, Soybean, Cotton, Sugarcane, Onion, Tomato, Potato, Green Chilli, Turmeric, etc.
            Use realistic Indian market names and Maharashtra districts like Pune, Nashik, Nagpur, Aurangabad, Kolhapur, Sangli, Solapur, Ahmednagar.
            Prices should be realistic for Indian markets (e.g., Rice: 2500-3500, Wheat: 2200-2800, Onion: 1500-4000, etc per quintal).`
          },
          {
            role: "user",
            content: `Generate current market prices for agricultural commodities in Maharashtra APMCs for today (${new Date().toISOString().split('T')[0]}). Return only the JSON array.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_market_prices",
              description: "Update market prices in the database",
              parameters: {
                type: "object",
                properties: {
                  prices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        crop_name: { type: "string" },
                        price_per_quintal: { type: "number" },
                        market_name: { type: "string" },
                        district: { type: "string" }
                      },
                      required: ["crop_name", "price_per_quintal", "market_name", "district"]
                    }
                  }
                },
                required: ["prices"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "update_market_prices" } }
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

    // Extract prices from tool call
    let prices = [];
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      prices = args.prices || [];
    }

    if (prices.length === 0) {
      throw new Error("No price data received from AI");
    }

    // Clear existing prices and insert new ones
    const { error: deleteError } = await supabase
      .from("market_prices")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Error deleting old prices:", deleteError);
    }

    // Insert new prices
    const pricesWithTimestamp = prices.map((p: any) => ({
      ...p,
      updated_at: new Date().toISOString()
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from("market_prices")
      .insert(pricesWithTimestamp)
      .select();

    if (insertError) {
      console.error("Error inserting prices:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${insertedData?.length || 0} market prices`,
        prices: insertedData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-market-prices:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
