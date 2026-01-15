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
    const { district } = await req.json();
    const location = district || "Maharashtra";
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentDate = new Date().toISOString().split('T')[0];

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
            content: `You are an expert on Indian government agricultural schemes and subsidies, particularly for Maharashtra state.
            
            Current Date: ${currentDate}
            
            Provide accurate information about:
            - Central government schemes (PM-KISAN, PM Fasal Bima Yojana, etc.)
            - Maharashtra state schemes (Nanaji Deshmukh Krishi Sanjivani, Mahatma Phule Krishi Karj Mafi, etc.)
            - District-specific schemes and subsidies
            - Application deadlines and eligibility criteria
            
            Focus on schemes that are currently active or accepting applications.
            Return ONLY valid JSON.`
          },
          {
            role: "user",
            content: `List all active government agricultural schemes available for farmers in ${location} district, Maharashtra. Include application deadlines, benefits, eligibility, and how to apply.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_government_schemes",
              description: "Provide list of government schemes for farmers",
              parameters: {
                type: "object",
                properties: {
                  district: { type: "string" },
                  state: { type: "string" },
                  last_updated: { type: "string" },
                  schemes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        name_hindi: { type: "string" },
                        type: { type: "string", enum: ["central", "state", "district"] },
                        category: { type: "string", enum: ["subsidy", "insurance", "loan", "direct_benefit", "infrastructure", "training", "market_support"] },
                        description: { type: "string" },
                        benefits: { type: "array", items: { type: "string" } },
                        benefit_amount: { type: "string" },
                        eligibility: { type: "array", items: { type: "string" } },
                        documents_required: { type: "array", items: { type: "string" } },
                        application_deadline: { type: "string" },
                        is_deadline_approaching: { type: "boolean" },
                        days_remaining: { type: "number" },
                        status: { type: "string", enum: ["open", "closing_soon", "closed", "upcoming"] },
                        how_to_apply: { type: "string" },
                        apply_link: { type: "string" },
                        helpline: { type: "string" },
                        is_new: { type: "boolean" },
                        priority: { type: "string", enum: ["high", "medium", "low"] }
                      },
                      required: ["name", "type", "category", "description", "benefits", "eligibility", "status", "how_to_apply"]
                    }
                  },
                  latest_announcements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        date: { type: "string" },
                        description: { type: "string" },
                        scheme_name: { type: "string" },
                        is_important: { type: "boolean" }
                      },
                      required: ["title", "date", "description"]
                    }
                  },
                  upcoming_deadlines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        scheme_name: { type: "string" },
                        deadline: { type: "string" },
                        days_remaining: { type: "number" },
                        action_required: { type: "string" }
                      },
                      required: ["scheme_name", "deadline", "days_remaining"]
                    }
                  },
                  statistics: {
                    type: "object",
                    properties: {
                      total_schemes: { type: "number" },
                      open_schemes: { type: "number" },
                      closing_soon: { type: "number" },
                      total_benefit_potential: { type: "string" }
                    }
                  }
                },
                required: ["district", "schemes", "latest_announcements", "upcoming_deadlines"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_government_schemes" } }
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

    let schemesData = null;
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      schemesData = JSON.parse(toolCall.function.arguments);
    }

    if (!schemesData) {
      throw new Error("No schemes data received from AI");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: schemesData,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in government-schemes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
