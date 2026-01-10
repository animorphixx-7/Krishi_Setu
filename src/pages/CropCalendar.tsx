import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, Sprout, Loader2, Sun, CloudRain, Wheat, Leaf,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Droplets,
  Thermometer, ArrowRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Crop {
  name: string;
  local_name?: string;
  category: "cereal" | "pulse" | "oilseed" | "cash_crop" | "vegetable" | "fruit";
  season: "kharif" | "rabi" | "zaid" | "perennial";
  sowing_months: string[];
  harvesting_months: string[];
  duration_days: number;
  optimal_temp_min?: number;
  optimal_temp_max?: number;
  water_requirement?: "low" | "medium" | "high";
  soil_type?: string[];
  current_status: "sowing_time" | "growing" | "harvesting_time" | "off_season" | "land_preparation";
  tips: string[];
  market_demand?: "low" | "medium" | "high";
}

interface MonthlyActivity {
  month: string;
  is_current: boolean;
  primary_activities: string[];
  crops_to_sow: string[];
  crops_to_harvest: string[];
  weather_considerations?: string;
  irrigation_advice?: string;
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  crop: string;
  deadline?: string;
  reason: string;
}

interface Alert {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface CalendarData {
  region: string;
  current_month: string;
  current_season: string;
  season_description?: string;
  crops: Crop[];
  monthly_activities: MonthlyActivity[];
  immediate_recommendations: Recommendation[];
  alerts?: Alert[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DISTRICTS = [
  "Pune", "Nashik", "Nagpur", "Aurangabad", "Kolhapur", 
  "Sangli", "Solapur", "Ahmednagar", "Satara", "Jalgaon"
];

const CropCalendar = () => {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("Pune");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crop-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            district: selectedDistrict,
            month: selectedMonth
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
          toast.error(result.error || "Failed to fetch crop calendar");
        }
        return;
      }

      setCalendarData(result.data);
      setLastUpdated(new Date());
      toast.success(`Crop calendar updated for ${selectedDistrict}`);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      toast.error("Failed to fetch crop calendar");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sowing_time": return <Badge className="bg-green-500">Sowing Time</Badge>;
      case "growing": return <Badge className="bg-blue-500">Growing</Badge>;
      case "harvesting_time": return <Badge className="bg-amber-500">Harvest Time</Badge>;
      case "land_preparation": return <Badge className="bg-purple-500">Land Prep</Badge>;
      case "off_season": return <Badge variant="secondary">Off Season</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeasonColor = (season: string) => {
    switch (season) {
      case "kharif": return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800";
      case "rabi": return "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-800";
      case "zaid": return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800";
      case "perennial": return "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800";
      default: return "bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cereal": return <Wheat className="h-4 w-4" />;
      case "pulse": return <Leaf className="h-4 w-4" />;
      case "vegetable": return <Sprout className="h-4 w-4" />;
      case "fruit": return <Sun className="h-4 w-4" />;
      default: return <Sprout className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "medium": return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "low": return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      default: return "border-l-gray-500";
    }
  };

  const getWaterIcon = (requirement?: string) => {
    switch (requirement) {
      case "high": return <Droplets className="h-4 w-4 text-blue-600" />;
      case "medium": return <Droplets className="h-4 w-4 text-blue-400" />;
      case "low": return <Droplets className="h-4 w-4 text-blue-200" />;
      default: return null;
    }
  };

  const filteredCrops = calendarData?.crops.filter(crop => 
    selectedCategory === "all" || crop.category === selectedCategory
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Crop Calendar</h1>
          </div>
          <p className="text-muted-foreground">
            Plan your farming activities with optimal planting and harvesting windows
            {lastUpdated && (
              <span className="ml-2 text-xs">
                (Updated: {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              {DISTRICTS.map(district => (
                <SelectItem key={district} value={district}>{district}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={fetchCalendar} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {loading ? "Loading..." : "Get Calendar"}
          </Button>
        </div>

        {!calendarData && !loading && (
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Get Your Crop Calendar</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Select your district and month to get AI-powered recommendations 
                for optimal planting and harvesting times.
              </p>
              <Button onClick={fetchCalendar} size="lg">
                <Sprout className="h-5 w-5 mr-2" />
                Generate Calendar
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Generating crop calendar...</p>
            <p className="text-muted-foreground text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {calendarData && !loading && (
          <>
            {/* Season Overview */}
            <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                      {calendarData.current_season.charAt(0).toUpperCase() + calendarData.current_season.slice(1)} Season
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      {calendarData.region} • {calendarData.current_month}
                    </p>
                  </div>
                  {calendarData.season_description && (
                    <p className="text-sm text-green-800 dark:text-green-200 max-w-md">
                      {calendarData.season_description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            {calendarData.alerts && calendarData.alerts.length > 0 && (
              <div className="mb-6 space-y-2">
                {calendarData.alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-3 p-4 rounded-lg ${
                      alert.severity === "critical" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" :
                      alert.severity === "warning" ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900" :
                      "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                    }`} />
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Immediate Recommendations */}
            <Card className="mb-6 shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Immediate Actions
                </CardTitle>
                <CardDescription>Priority tasks based on current timing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {calendarData.immediate_recommendations.map((rec, idx) => (
                    <Card key={idx} className={`border-l-4 ${getPriorityColor(rec.priority)}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          {rec.deadline && (
                            <span className="text-xs text-muted-foreground">{rec.deadline}</span>
                          )}
                        </div>
                        <h4 className="font-semibold mb-1">{rec.action}</h4>
                        <p className="text-sm text-primary font-medium mb-1">{rec.crop}</p>
                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="crops" className="mb-8">
              <TabsList className="mb-4">
                <TabsTrigger value="crops">Crop Details</TabsTrigger>
                <TabsTrigger value="monthly">Monthly View</TabsTrigger>
              </TabsList>

              <TabsContent value="crops">
                {/* Category Filter */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button 
                    variant={selectedCategory === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Crops
                  </Button>
                  {["cereal", "pulse", "oilseed", "cash_crop", "vegetable", "fruit"].map(cat => (
                    <Button 
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {getCategoryIcon(cat)}
                      <span className="ml-1 capitalize">{cat.replace("_", " ")}</span>
                    </Button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCrops.map((crop, idx) => (
                    <Card key={idx} className={`border ${getSeasonColor(crop.season)}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {getCategoryIcon(crop.category)}
                              {crop.name}
                            </CardTitle>
                            {crop.local_name && (
                              <p className="text-sm text-muted-foreground">{crop.local_name}</p>
                            )}
                          </div>
                          {getStatusBadge(crop.current_status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline" className="capitalize">{crop.season}</Badge>
                            <span className="text-muted-foreground">{crop.duration_days} days</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Sowing</p>
                              <p className="font-medium">{crop.sowing_months.slice(0, 2).join(", ")}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Harvest</p>
                              <p className="font-medium">{crop.harvesting_months.slice(0, 2).join(", ")}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {crop.optimal_temp_min && crop.optimal_temp_max && (
                              <div className="flex items-center gap-1">
                                <Thermometer className="h-3 w-3" />
                                {crop.optimal_temp_min}-{crop.optimal_temp_max}°C
                              </div>
                            )}
                            {crop.water_requirement && (
                              <div className="flex items-center gap-1">
                                {getWaterIcon(crop.water_requirement)}
                                <span className="capitalize">{crop.water_requirement}</span>
                              </div>
                            )}
                            {crop.market_demand && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span className="capitalize">{crop.market_demand}</span>
                              </div>
                            )}
                          </div>

                          {crop.tips.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">{crop.tips[0]}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="monthly">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {calendarData.monthly_activities.map((activity, idx) => (
                    <Card 
                      key={idx} 
                      className={`${activity.is_current ? "ring-2 ring-primary bg-primary/5" : ""}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          {activity.month}
                          {activity.is_current && <Badge>Current</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {activity.crops_to_sow.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                              <Sprout className="h-3 w-3" /> Sow
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {activity.crops_to_sow.map((crop, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{crop}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {activity.crops_to_harvest.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                              <Wheat className="h-3 w-3" /> Harvest
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {activity.crops_to_harvest.map((crop, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{crop}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {activity.primary_activities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Activities</p>
                            <ul className="text-xs space-y-1">
                              {activity.primary_activities.slice(0, 3).map((act, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {act}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {activity.weather_considerations && (
                          <p className="text-xs text-muted-foreground pt-2 border-t">
                            <CloudRain className="h-3 w-3 inline mr-1" />
                            {activity.weather_considerations}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Crop calendar recommendations are AI-generated based on regional patterns and may vary 
            based on specific microclimate conditions, soil type, and local factors. Consult with local agricultural 
            extension officers for site-specific advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CropCalendar;
