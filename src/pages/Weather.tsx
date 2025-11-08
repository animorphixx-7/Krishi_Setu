import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cloud, Droplets, Wind, Eye, Search } from "lucide-react";
import Navbar from "@/components/Navbar";

const Weather = () => {
  const [city, setCity] = useState("Pune");
  
  // Mock weather data - in production, integrate with a weather API
  const weatherData = {
    city: "Pune",
    temperature: 28,
    condition: "Partly Cloudy",
    humidity: 65,
    windSpeed: 12,
    visibility: 10,
    forecast: [
      { day: "Today", temp: 28, condition: "Partly Cloudy" },
      { day: "Tomorrow", temp: 30, condition: "Sunny" },
      { day: "Day 3", temp: 27, condition: "Cloudy" },
      { day: "Day 4", temp: 26, condition: "Rainy" },
      { day: "Day 5", temp: 29, condition: "Sunny" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-primary">Weather Forecast</h1>
          </div>
          <p className="text-muted-foreground">Plan your farming activities with accurate weather information</p>
        </div>

        <div className="mb-8 flex gap-4 max-w-md">
          <Input
            placeholder="Enter city name..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Button>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{weatherData.temperature}°C</div>
              <p className="text-sm text-muted-foreground mt-1">{weatherData.condition}</p>
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
              <div className="text-3xl font-bold text-primary">{weatherData.humidity}%</div>
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
              <div className="text-3xl font-bold text-primary">{weatherData.windSpeed} km/h</div>
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
              <div className="text-3xl font-bold text-primary">{weatherData.visibility} km</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>5-Day Forecast</CardTitle>
            <CardDescription>Weather predictions for {weatherData.city}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {weatherData.forecast.map((day, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="pt-6 text-center">
                    <p className="font-semibold mb-2">{day.day}</p>
                    <p className="text-2xl font-bold text-primary mb-1">{day.temp}°C</p>
                    <p className="text-sm text-muted-foreground">{day.condition}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-6">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Farming Tip</h3>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Based on the current weather forecast, it's a good time for irrigation and outdoor farming activities. 
            However, monitor the forecast for Day 4 as rain is expected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Weather;
