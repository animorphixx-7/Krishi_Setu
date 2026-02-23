import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cloud, Droplets, Wind, Eye, Search, Sun, CloudRain, Loader2, 
  Thermometer, Sprout, Bug, Scissors, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Clock, Sunrise, Sunset
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface CurrentWeather {
  temperature: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  visibility: number;
  feels_like?: number;
  uv_index?: number;
}

interface ForecastDay {
  date: string;
  day_name: string;
  temp_high: number;
  temp_low: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  rain_chance: number;
  sunrise?: string;
  sunset?: string;
}

interface FarmingActivity {
  activity: string;
  suitable: boolean;
  rating: "excellent" | "good" | "moderate" | "poor" | "avoid";
  reason: string;
  best_time?: string;
}

interface DayRecommendation {
  date: string;
  day_name: string;
  activities: FarmingActivity[];
  overall_tip: string;
}

interface WeatherAlert {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface WeatherData {
  location: string;
  current: CurrentWeather;
  forecast: ForecastDay[];
  farming_recommendations: DayRecommendation[];
  weekly_summary: string;
  alerts?: WeatherAlert[];
}

const Weather = () => {
  const [city, setCity] = useState("Pune");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to access weather forecasts");
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-weather-forecast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ city }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error(result.error || "Failed to fetch weather");
        }
        return;
      }

      setWeatherData(result.data);
      setLastUpdated(new Date());
      setSelectedDay(0);
      toast.success(`Weather forecast updated for ${result.data.location}`);
    } catch (error) {
      console.error("Error fetching weather:", error);
      toast.error("Failed to fetch weather forecast");
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("rain") || lower.includes("shower")) return <CloudRain className="h-6 w-6" />;
    if (lower.includes("sun") || lower.includes("clear")) return <Sun className="h-6 w-6" />;
    return <Cloud className="h-6 w-6" />;
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-emerald-400";
      case "moderate": return "bg-yellow-500";
      case "poor": return "bg-orange-500";
      case "avoid": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case "excellent": return <Badge className="bg-green-500 hover:bg-green-600">Excellent</Badge>;
      case "good": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Good</Badge>;
      case "moderate": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Moderate</Badge>;
      case "poor": return <Badge className="bg-orange-500 hover:bg-orange-600">Poor</Badge>;
      case "avoid": return <Badge variant="destructive">Avoid</Badge>;
      default: return <Badge variant="secondary">{rating}</Badge>;
    }
  };

  const getActivityIcon = (activity: string) => {
    const lower = activity.toLowerCase();
    if (lower.includes("sow") || lower.includes("plant")) return <Sprout className="h-5 w-5" />;
    if (lower.includes("spray") || lower.includes("pesticide")) return <Bug className="h-5 w-5" />;
    if (lower.includes("harvest")) return <Scissors className="h-5 w-5" />;
    if (lower.includes("irrigat")) return <Droplets className="h-5 w-5" />;
    return <Sprout className="h-5 w-5" />;
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-primary">Weather Forecast</h1>
            </div>
            <p className="text-muted-foreground">
              7-day forecast with AI-powered farming recommendations
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  (Updated: {lastUpdated.toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mb-8 flex gap-4 max-w-md">
          <Input
            placeholder="Enter city or district..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchWeather()}
          />
          <Button onClick={fetchWeather} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {loading ? "Loading..." : "Get Forecast"}
          </Button>
        </div>

        {!weatherData && !loading && (
          <Card className="shadow-medium">
            <CardContent className="py-12 text-center">
              <Cloud className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Get Weather Forecast</h3>
              <p className="text-muted-foreground mb-6">
                Enter your city or district and click "Get Forecast" to see 7-day weather predictions 
                with personalized farming activity recommendations.
              </p>
              <Button onClick={fetchWeather} size="lg">
                <Sun className="h-5 w-5 mr-2" />
                Fetch Weather for {city}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Fetching weather forecast and farming recommendations...</p>
            <p className="text-muted-foreground text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {weatherData && !loading && (
          <>
            {/* Alerts */}
            {weatherData.alerts && weatherData.alerts.length > 0 && (
              <div className="mb-6 space-y-2">
                {weatherData.alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-3 p-4 rounded-lg ${
                      alert.severity === "critical" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" :
                      alert.severity === "warning" ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900" :
                      "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900"
                    }`}
                  >
                    {getAlertIcon(alert.severity)}
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Weather */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.temperature}°C</div>
                  <p className="text-sm text-muted-foreground mt-1">{weatherData.current.condition}</p>
                  {weatherData.current.feels_like && (
                    <p className="text-xs text-muted-foreground">Feels like {weatherData.current.feels_like}°C</p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Droplets className="h-4 w-4 mr-2" />
                    Humidity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.humidity}%</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Wind className="h-4 w-4 mr-2" />
                    Wind Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.wind_speed} km/h</div>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.visibility} km</div>
                </CardContent>
              </Card>
            </div>

            {/* 7-Day Forecast */}
            <Card className="shadow-medium mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>7-Day Forecast for {weatherData.location}</span>
                  <Button variant="outline" size="sm" onClick={fetchWeather} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>Click a day to see detailed farming recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-7">
                  {weatherData.forecast.map((day, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedDay === index ? "ring-2 ring-primary bg-primary/5" : "bg-muted/50"
                      }`}
                      onClick={() => setSelectedDay(index)}
                    >
                      <CardContent className="pt-4 pb-4 px-3 text-center">
                        <p className="font-semibold text-sm mb-1">{day.day_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">{day.date}</p>
                        <div className="flex justify-center mb-2">
                          {getConditionIcon(day.condition)}
                        </div>
                        <p className="text-lg font-bold text-primary">{day.temp_high}°</p>
                        <p className="text-sm text-muted-foreground">{day.temp_low}°</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Droplets className="h-3 w-3 text-blue-500" />
                          <span className="text-xs">{day.rain_chance}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Farming Recommendations for Selected Day */}
            {weatherData.farming_recommendations[selectedDay] && (
              <Card className="shadow-medium mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Sprout className="h-6 w-6 text-green-600" />
                    Farming Recommendations - {weatherData.farming_recommendations[selectedDay].day_name}
                  </CardTitle>
                  <CardDescription>
                    {weatherData.farming_recommendations[selectedDay].overall_tip}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {weatherData.farming_recommendations[selectedDay].activities.map((activity, idx) => (
                      <Card key={idx} className={`border-l-4 ${activity.suitable ? "border-l-green-500" : "border-l-red-500"}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getActivityIcon(activity.activity)}
                              <h4 className="font-semibold">{activity.activity}</h4>
                            </div>
                            {getRatingBadge(activity.rating)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{activity.reason}</p>
                          {activity.best_time && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Best time: {activity.best_time}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Weekly Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Sprout className="h-5 w-5" />
                Weekly Farming Summary
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                {weatherData.weekly_summary}
              </p>
            </div>
          </>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Weather forecasts and farming recommendations are AI-generated estimates based on typical patterns. 
            Actual conditions may vary. Always consult local meteorological services and agricultural experts for critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Weather;
