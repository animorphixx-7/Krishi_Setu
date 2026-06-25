import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cloud, Droplets, Wind, Eye, Search, Sun, CloudRain,
  Thermometer, Sprout, Bug, Scissors, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Clock, WifiOff,
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
  source?: string;
}

interface WeatherResponse {
  success: boolean;
  data: WeatherData;
  cached: boolean;
  stale: boolean;
  fetched_at: string;
  expires_at: string;
  warning?: string;
}

const SESSION_CACHE_KEY = "krishi:weather:last";

const Weather = () => {
  const [city, setCity] = useState("");
  const [inputCity, setInputCity] = useState("");
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const fetchWeather = useCallback(async (targetCity: string) => {
    if (!targetCity) return;
    // Dedup in-flight requests
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Please sign in to view weather forecasts.");
          return;
        }

        const { data, error: invokeError } = await supabase.functions.invoke<WeatherResponse>(
          "fetch-weather-forecast",
          { body: { city: targetCity } },
        );

        if (invokeError) throw invokeError;
        if (!data?.success || !data.data) {
          throw new Error("Invalid response from weather service");
        }

        setWeatherData(data.data);
        setStale(!!data.stale);
        setFetchedAt(new Date(data.fetched_at));
        setExpiresAt(new Date(data.expires_at));
        setSelectedDay(0);
        setCity(targetCity);

        try {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
            city: targetCity,
            response: data,
          }));
        } catch { /* ignore */ }

        if (data.stale) {
          toast.warning("Showing last cached weather — provider unavailable.");
        } else if (!data.cached) {
          toast.success(`Weather updated for ${data.data.location}`);
        }
      } catch (e: any) {
        console.error("Weather fetch failed:", e);
        const msg = e?.context?.error || e?.message || "Failed to load weather";
        // Try sessionStorage fallback
        try {
          const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw) as { city: string; response: WeatherResponse };
            if (cached?.response?.data) {
              setWeatherData(cached.response.data);
              setStale(true);
              setFetchedAt(new Date(cached.response.fetched_at));
              setExpiresAt(new Date(cached.response.expires_at));
              setError(null);
              toast.warning("Network issue — showing previously loaded weather.");
              return;
            }
          }
        } catch { /* ignore */ }
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    inFlightRef.current = run.finally(() => { inFlightRef.current = null; });
    return inFlightRef.current;
  }, []);

  // Initial load: use profile district, else cached city, else Pune
  useEffect(() => {
    (async () => {
      let initialCity = "Pune";
      try {
        const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as { city: string; response: WeatherResponse };
          if (cached?.city && cached?.response?.data) {
            initialCity = cached.city;
            // Hydrate immediately so UI shows last-known data while we refresh
            setWeatherData(cached.response.data);
            setFetchedAt(new Date(cached.response.fetched_at));
            setExpiresAt(new Date(cached.response.expires_at));
            const isExpired = new Date(cached.response.expires_at) <= new Date();
            setStale(isExpired);
            if (!isExpired) {
              // Fresh enough — skip immediate refetch
              setInputCity(initialCity);
              setCity(initialCity);
              setLoading(false);
              return;
            }
          }
        }
      } catch { /* ignore */ }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("district")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.district) initialCity = profile.district;
        }
      } catch { /* ignore */ }

      setInputCity(initialCity);
      fetchWeather(initialCity);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getConditionIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes("rain") || lower.includes("shower") || lower.includes("drizzle")) return <CloudRain className="h-6 w-6" />;
    if (lower.includes("clear") || lower.includes("sun")) return <Sun className="h-6 w-6" />;
    return <Cloud className="h-6 w-6" />;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputCity.trim();
    if (v) fetchWeather(v);
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
              Real-time 7-day forecast from Open-Meteo with farming recommendations
              {fetchedAt && (
                <span className="ml-2 text-xs">
                  · Updated {fetchedAt.toLocaleTimeString()}
                  {expiresAt && !stale && ` · Refreshes ${expiresAt.toLocaleTimeString()}`}
                </span>
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 flex gap-2 max-w-md">
          <Input
            placeholder="Enter city or district..."
            value={inputCity}
            onChange={(e) => setInputCity(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Get Forecast
          </Button>
        </form>

        {stale && weatherData && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
            <WifiOff className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">Showing cached weather</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Live data is temporarily unavailable. We'll refresh automatically when the service is back.
              </p>
            </div>
          </div>
        )}

        {error && !weatherData && (
          <Card className="shadow-medium border-destructive/40">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-xl font-semibold mb-2">Weather unavailable</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => fetchWeather(inputCity || city || "Pune")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && !weatherData && <WeatherSkeleton />}

        {weatherData && (
          <>
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Thermometer className="h-4 w-4" /> Temperature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.temperature}°C</div>
                  <p className="text-sm text-muted-foreground mt-1">{weatherData.current.condition}</p>
                  {weatherData.current.feels_like !== undefined && (
                    <p className="text-xs text-muted-foreground">Feels like {weatherData.current.feels_like}°C</p>
                  )}
                </CardContent>
              </Card>
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Droplets className="h-4 w-4 mr-2" /> Humidity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.humidity}%</div>
                </CardContent>
              </Card>
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Wind className="h-4 w-4 mr-2" /> Wind Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.wind_speed} km/h</div>
                </CardContent>
              </Card>
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <Eye className="h-4 w-4 mr-2" /> Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{weatherData.current.visibility} km</div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-medium mb-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>7-Day Forecast for {weatherData.location}</span>
                  <Button variant="outline" size="sm" onClick={() => fetchWeather(city || inputCity)} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>Click a day to see detailed farming recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
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
                        <p className="text-xs text-muted-foreground mb-2">{day.date.slice(5)}</p>
                        <div className="flex justify-center mb-2">{getConditionIcon(day.condition)}</div>
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
                              <Clock className="h-3 w-3" /> Best time: {activity.best_time}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Sprout className="h-5 w-5" /> Weekly Farming Summary
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">{weatherData.weekly_summary}</p>
            </div>
          </>
        )}

        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <p className="text-sm text-muted-foreground">
            <strong>Data source:</strong> Live weather from Open-Meteo, cached for 1 hour. Farming
            recommendations are derived from real forecast values (rain probability, wind, humidity,
            temperature). Always confirm critical decisions with local meteorological services.
          </p>
        </div>
      </div>
    </div>
  );
};

const WeatherSkeleton = () => (
  <>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-soft">
          <CardHeader className="pb-3"><Skeleton className="h-4 w-24" /></CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-20 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="shadow-medium mb-8">
      <CardHeader>
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="bg-muted/50">
              <CardContent className="pt-4 pb-4 px-3 text-center space-y-2">
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-6 w-6 mx-auto rounded-full" />
                <Skeleton className="h-5 w-10 mx-auto" />
                <Skeleton className="h-3 w-8 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
    <Card className="shadow-medium mb-8">
      <CardHeader>
        <Skeleton className="h-6 w-72 mb-2" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  </>
);

export default Weather;
