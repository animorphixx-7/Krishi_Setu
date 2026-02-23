import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Scale, Loader2, Sun, CloudRain, TrendingUp, TrendingDown, Minus,
  Droplets, Clock, Trophy, AlertTriangle, CheckCircle, Star,
  Wheat, Leaf, Sprout, Target, DollarSign, Shield, ThumbsUp, ThumbsDown,
  Database, IndianRupee, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface CropData {
  name: string;
  local_name?: string;
  category?: string;
  season?: string;
  weather_score: number;
  weather_suitability: "excellent" | "good" | "moderate" | "poor";
  weather_analysis?: string;
  market_demand: "very_high" | "high" | "medium" | "low";
  market_score: number;
  current_price_range?: string;
  price_trend?: "rising" | "stable" | "falling";
  expected_profit_per_acre?: string;
  profitability_score: number;
  water_requirement?: "very_low" | "low" | "medium" | "high" | "very_high";
  water_score: number;
  duration_days?: number;
  optimal_sowing_window?: string;
  risk_factors?: string[];
  advantages: string[];
  disadvantages: string[];
  overall_score: number;
  recommendation_rank: number;
  actual_price_per_quintal?: number;
}

interface RealMarketPrice {
  prices: number[];
  markets: string[];
  districts: string[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface ComparisonSummary {
  best_for_weather: string;
  best_for_market: string;
  best_for_profit?: string;
  best_for_water_efficiency?: string;
  overall_winner: string;
  winner_reason: string;
}

interface Recommendation {
  primary_choice: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  alternative?: string;
  alternative_reason?: string;
  caution?: string;
}

interface ComparisonData {
  region: string;
  current_weather?: {
    temp: number;
    humidity: number;
    conditions: string;
  };
  crops: CropData[];
  comparison_summary: ComparisonSummary;
  recommendation: Recommendation;
  real_market_prices?: Record<string, RealMarketPrice>;
  market_data_available?: boolean;
}

const DISTRICTS = [
  "Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", 
  "Sangli", "Solapur", "Ahmednagar", "Satara", "Jalgaon"
];

const AVAILABLE_CROPS = [
  { name: "Rice", category: "cereal", season: "kharif" },
  { name: "Wheat", category: "cereal", season: "rabi" },
  { name: "Jowar (Sorghum)", category: "cereal", season: "kharif" },
  { name: "Bajra (Pearl Millet)", category: "cereal", season: "kharif" },
  { name: "Maize", category: "cereal", season: "kharif" },
  { name: "Cotton", category: "cash_crop", season: "kharif" },
  { name: "Soybean", category: "oilseed", season: "kharif" },
  { name: "Groundnut", category: "oilseed", season: "kharif" },
  { name: "Sunflower", category: "oilseed", season: "rabi" },
  { name: "Sugarcane", category: "cash_crop", season: "perennial" },
  { name: "Gram (Chickpea)", category: "pulse", season: "rabi" },
  { name: "Tur (Pigeon Pea)", category: "pulse", season: "kharif" },
  { name: "Moong (Green Gram)", category: "pulse", season: "kharif" },
  { name: "Urad (Black Gram)", category: "pulse", season: "kharif" },
  { name: "Onion", category: "vegetable", season: "rabi" },
  { name: "Tomato", category: "vegetable", season: "rabi" },
  { name: "Potato", category: "vegetable", season: "rabi" },
  { name: "Banana", category: "fruit", season: "perennial" },
];

const CropComparison = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);

  const toggleCrop = (cropName: string) => {
    setSelectedCrops(prev => {
      if (prev.includes(cropName)) {
        return prev.filter(c => c !== cropName);
      }
      if (prev.length >= 4) {
        toast.error("You can compare up to 4 crops at a time");
        return prev;
      }
      return [...prev, cropName];
    });
  };

  const syncMarketPrices = async () => {
    setSyncingPrices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to sync market prices");
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-market-prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(result.error || "Failed to sync market prices");
        }
        return;
      }

      setLastSyncTime(new Date());
      toast.success(`Market prices updated! ${result.prices?.length || 0} prices synced.`);
    } catch (error) {
      console.error("Error syncing prices:", error);
      toast.error("Failed to sync market prices");
    } finally {
      setSyncingPrices(false);
    }
  };

  const fetchComparison = async () => {
    if (selectedCrops.length < 2) {
      toast.error("Please select at least 2 crops to compare");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to compare crops");
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compare-crops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            crops: selectedCrops,
            district: selectedDistrict
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(result.error || "Failed to compare crops");
        }
        return;
      }

      setComparisonData(result.data);
      toast.success("Crop comparison generated successfully!");
    } catch (error) {
      console.error("Error comparing crops:", error);
      toast.error("Failed to compare crops");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-emerald-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-emerald-400";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSuitabilityBadge = (suitability: string) => {
    switch (suitability) {
      case "excellent": return <Badge className="bg-green-500">Excellent</Badge>;
      case "good": return <Badge className="bg-emerald-400">Good</Badge>;
      case "moderate": return <Badge className="bg-yellow-500">Moderate</Badge>;
      case "poor": return <Badge className="bg-red-500">Poor</Badge>;
      default: return <Badge variant="outline">{suitability}</Badge>;
    }
  };

  const getDemandBadge = (demand: string) => {
    switch (demand) {
      case "very_high": return <Badge className="bg-green-600">Very High</Badge>;
      case "high": return <Badge className="bg-green-500">High</Badge>;
      case "medium": return <Badge className="bg-yellow-500">Medium</Badge>;
      case "low": return <Badge className="bg-red-500">Low</Badge>;
      default: return <Badge variant="outline">{demand}</Badge>;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "rising": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "falling": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high": return <Badge className="bg-green-600">High Confidence</Badge>;
      case "medium": return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
      case "low": return <Badge className="bg-red-500">Low Confidence</Badge>;
      default: return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "cereal": return <Wheat className="h-4 w-4" />;
      case "pulse": return <Leaf className="h-4 w-4" />;
      case "vegetable": return <Sprout className="h-4 w-4" />;
      case "fruit": return <Sun className="h-4 w-4" />;
      default: return <Sprout className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Crop Comparison</h1>
          </div>
          <p className="text-muted-foreground">
            Compare crops side-by-side based on weather suitability, market demand, and profitability
          </p>
        </div>

        {/* Selection Area */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Select Crops to Compare
            </CardTitle>
            <CardDescription>Choose 2-4 crops to compare (Selected: {selectedCrops.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
              {AVAILABLE_CROPS.map(crop => (
                <div
                  key={crop.name}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCrops.includes(crop.name) 
                      ? "bg-primary/10 border-primary ring-2 ring-primary" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleCrop(crop.name)}
                >
                  <Checkbox 
                    checked={selectedCrops.includes(crop.name)}
                    onCheckedChange={() => toggleCrop(crop.name)}
                  />
                  <div className="flex items-center gap-1">
                    {getCategoryIcon(crop.category)}
                    <span className="text-sm font-medium">{crop.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedCrops.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {selectedCrops.map(crop => (
                  <Badge key={crop} variant="secondary" className="gap-1">
                    {crop}
                    <button 
                      className="ml-1 hover:text-destructive"
                      onClick={() => toggleCrop(crop)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={fetchComparison} 
                disabled={loading || syncingPrices || selectedCrops.length < 2}
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Scale className="h-4 w-4 mr-2" />
                )}
                {loading ? "Analyzing..." : "Compare Crops"}
              </Button>

              <Button 
                onClick={syncMarketPrices} 
                disabled={syncingPrices || loading}
                variant="outline"
                size="lg"
              >
                {syncingPrices ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncingPrices ? "Syncing..." : "Sync Prices"}
              </Button>

              {lastSyncTime && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Last synced: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Analyzing crops with weather and market data...</p>
            <p className="text-muted-foreground text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {comparisonData && !loading && (
          <>
            {/* Current Weather */}
            {comparisonData.current_weather && (
              <Card className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <Sun className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="font-semibold">{comparisonData.region} Weather</p>
                      <p className="text-sm text-muted-foreground">
                        {comparisonData.current_weather.temp}°C • {comparisonData.current_weather.humidity}% humidity • {comparisonData.current_weather.conditions}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real Market Prices Indicator */}
            {comparisonData.market_data_available && comparisonData.real_market_prices && (
              <Card className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-indigo-900 dark:text-indigo-100">Real Market Prices Used</span>
                    <Badge className="bg-indigo-500">Live Data</Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(comparisonData.real_market_prices).map(([cropName, priceData]) => (
                      <div key={cropName} className="flex items-center gap-2 p-2 bg-white/50 dark:bg-indigo-900/30 rounded-lg">
                        <IndianRupee className="h-4 w-4 text-indigo-600" />
                        <div className="text-sm">
                          <span className="font-medium">{cropName}:</span>
                          <span className="text-muted-foreground ml-1">
                            ₹{priceData.minPrice.toLocaleString()} - ₹{priceData.maxPrice.toLocaleString()}/q
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Prices sourced from Maharashtra APMC markets for accurate profitability estimates
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Winner Card */}
            <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-300 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Trophy className="h-12 w-12 text-amber-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                        {comparisonData.comparison_summary.overall_winner}
                      </h3>
                      <Badge className="bg-amber-500">Recommended</Badge>
                    </div>
                    <p className="text-amber-800 dark:text-amber-200 mb-3">
                      {comparisonData.comparison_summary.winner_reason}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {comparisonData.comparison_summary.best_for_weather === comparisonData.comparison_summary.overall_winner && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                          <CloudRain className="h-3 w-3 mr-1" /> Best Weather
                        </Badge>
                      )}
                      {comparisonData.comparison_summary.best_for_market === comparisonData.comparison_summary.overall_winner && (
                        <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-300">
                          <TrendingUp className="h-3 w-3 mr-1" /> Best Market
                        </Badge>
                      )}
                      {comparisonData.comparison_summary.best_for_profit === comparisonData.comparison_summary.overall_winner && (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                          <DollarSign className="h-3 w-3 mr-1" /> Best Profit
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {comparisonData.crops.sort((a, b) => a.recommendation_rank - b.recommendation_rank).map((crop, idx) => (
                <Card 
                  key={crop.name} 
                  className={`relative ${idx === 0 ? "ring-2 ring-amber-400" : ""}`}
                >
                  {idx === 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 shadow-lg">
                        <Trophy className="h-3 w-3 mr-1" /> #1 Choice
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{crop.name}</CardTitle>
                      <div className={`text-2xl font-bold ${getScoreColor(crop.overall_score)}`}>
                        {crop.overall_score}
                      </div>
                    </div>
                    {crop.local_name && (
                      <p className="text-sm text-muted-foreground">{crop.local_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Score</span>
                        <span className="font-medium">{crop.overall_score}/100</span>
                      </div>
                      <Progress value={crop.overall_score} className="h-2" />
                    </div>

                    {/* Weather Suitability */}
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <CloudRain className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Weather</span>
                        </div>
                        {getSuitabilityBadge(crop.weather_suitability)}
                      </div>
                      <Progress value={crop.weather_score} className="h-1.5 mb-2" />
                      {crop.weather_analysis && (
                        <p className="text-xs text-muted-foreground">{crop.weather_analysis}</p>
                      )}
                    </div>

                    {/* Market Demand */}
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Market</span>
                        </div>
                        {getDemandBadge(crop.market_demand)}
                      </div>
                      <Progress value={crop.market_score} className="h-1.5 mb-2" />
                      <div className="flex items-center justify-between text-xs">
                        {crop.current_price_range && (
                          <span>{crop.current_price_range}</span>
                        )}
                        <div className="flex items-center gap-1">
                          {getTrendIcon(crop.price_trend)}
                          <span className="capitalize">{crop.price_trend}</span>
                        </div>
                      </div>
                    </div>

                    {/* Profitability */}
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium">Profit</span>
                          {comparisonData.real_market_prices?.[crop.name] && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-400 text-emerald-600">
                              Real Price
                            </Badge>
                          )}
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(crop.profitability_score)}`}>
                          {crop.profitability_score}%
                        </span>
                      </div>
                      <Progress value={crop.profitability_score} className="h-1.5" />
                      {comparisonData.real_market_prices?.[crop.name] && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          ₹{comparisonData.real_market_prices[crop.name].avgPrice.toLocaleString()}/quintal avg
                        </p>
                      )}
                      {crop.expected_profit_per_acre && (
                        <p className="text-xs text-muted-foreground mt-1">{crop.expected_profit_per_acre}</p>
                      )}
                    </div>

                    {/* Water Requirement */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Droplets className="h-4 w-4 text-blue-400" />
                        <span>Water Need</span>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {crop.water_requirement?.replace("_", " ") || "Medium"}
                      </Badge>
                    </div>

                    {/* Duration */}
                    {crop.duration_days && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Duration</span>
                        </div>
                        <span>{crop.duration_days} days</span>
                      </div>
                    )}

                    {/* Advantages & Disadvantages */}
                    <div className="pt-3 border-t space-y-2">
                      {crop.advantages.slice(0, 2).map((adv, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <ThumbsUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-green-700 dark:text-green-300">{adv}</span>
                        </div>
                      ))}
                      {crop.disadvantages.slice(0, 2).map((dis, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <ThumbsDown className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-red-700 dark:text-red-300">{dis}</span>
                        </div>
                      ))}
                    </div>

                    {/* Risk Factors */}
                    {crop.risk_factors && crop.risk_factors.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {crop.risk_factors[0]}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Comparison Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Quick Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <CloudRain className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Best for Weather</p>
                      <p className="font-semibold">{comparisonData.comparison_summary.best_for_weather}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Best for Market</p>
                      <p className="font-semibold">{comparisonData.comparison_summary.best_for_market}</p>
                    </div>
                  </div>
                  {comparisonData.comparison_summary.best_for_profit && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <DollarSign className="h-8 w-8 text-emerald-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Best for Profit</p>
                        <p className="font-semibold">{comparisonData.comparison_summary.best_for_profit}</p>
                      </div>
                    </div>
                  )}
                  {comparisonData.comparison_summary.best_for_water_efficiency && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                      <Droplets className="h-8 w-8 text-cyan-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Best Water Efficiency</p>
                        <p className="font-semibold">{comparisonData.comparison_summary.best_for_water_efficiency}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Final Recommendation */}
            <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <CheckCircle className="h-5 w-5" />
                  AI Recommendation
                  {getConfidenceBadge(comparisonData.recommendation.confidence)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white dark:bg-green-900/50 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground">Primary Choice</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {comparisonData.recommendation.primary_choice}
                    </p>
                  </div>
                  {comparisonData.recommendation.alternative && (
                    <div className="p-4 bg-white/50 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Alternative</p>
                      <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                        {comparisonData.recommendation.alternative}
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="text-green-800 dark:text-green-200">
                  <strong>Why:</strong> {comparisonData.recommendation.reasoning}
                </p>
                
                {comparisonData.recommendation.alternative_reason && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Alternative reason:</strong> {comparisonData.recommendation.alternative_reason}
                  </p>
                )}
                
                {comparisonData.recommendation.caution && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Caution:</strong> {comparisonData.recommendation.caution}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Crop comparisons are AI-generated based on current weather conditions
            {comparisonData?.market_data_available ? ", real market prices from Maharashtra APMCs," : ", estimated market trends,"} 
            and agricultural best practices. Actual results may vary based on local conditions, 
            farming practices, and market fluctuations. Consult local agricultural experts for final decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CropComparison;
