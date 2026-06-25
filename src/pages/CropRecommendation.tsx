import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sprout, TrendingUp, Droplets, Calendar, AlertTriangle, IndianRupee, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Recommendation {
  crop: string;
  variety?: string;
  expected_yield: string;
  water_requirement: "Low" | "Medium" | "High";
  growing_duration_days: number;
  profit_potential: "Low" | "Medium" | "High";
  risk_level: "Low" | "Medium" | "High";
  estimated_profit_per_acre_inr: string;
  reasoning: string;
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  general_advice?: string;
  error?: string;
}

const SOILS = ["Black", "Red", "Alluvial", "Sandy", "Clay", "Loamy", "Laterite"];
const SEASONS = ["Kharif", "Rabi", "Zaid", "Summer"];
const WATER = ["Low", "Medium", "High"];

const levelTone = (l?: string) => {
  switch (l) {
    case "High": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "Medium": return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Low": return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function CropRecommendation() {
  const [location, setLocation] = useState("");
  const [soil, setSoil] = useState("");
  const [season, setSeason] = useState("");
  const [water, setWater] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  const validate = () => {
    if (!location.trim()) return "Please enter your location";
    if (!soil) return "Please select soil type";
    if (!season) return "Please select season";
    if (!water) return "Please select water availability";
    const n = Number(farmSize);
    if (!Number.isFinite(n) || n <= 0) return "Enter a valid farm size";
    if (n > 10000) return "Farm size seems too large";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("crop-recommendation", {
        body: {
          location: location.trim(),
          soil: soil.toLowerCase(),
          season: season.toLowerCase(),
          water: water.toLowerCase(),
          farmSize: Number(farmSize),
          language: "English",
        },
      });
      if (error) throw error;
      if ((data as RecommendationResponse)?.error) {
        toast.error((data as RecommendationResponse).error!);
      } else {
        const rec = data as RecommendationResponse;
        setResult(rec);
        // Persist recommendation history (best-effort)
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const recs: any = (rec as any).recommendations ?? (rec as any).crops ?? rec;
            const top = Array.isArray(recs) ? (recs[0]?.name || recs[0]?.crop || null) : null;
            await supabase.from("crop_recommendations").insert({
              user_id: user.id,
              district: location.trim(),
              soil_type: soil.toLowerCase(),
              farm_size: Number(farmSize),
              irrigation_type: water.toLowerCase(),
              season: season.toLowerCase(),
              water_availability: water.toLowerCase(),
              inputs: { location, soil, season, water, farmSize: Number(farmSize) },
              recommendations: rec as any,
              top_crop: top,
            });
          }
        } catch (err) { console.error("save recommendation failed:", err); }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch recommendations";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pb-24 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Crop Recommendation</h1>
          </div>
          <p className="text-muted-foreground">
            AI-powered crop suggestions tailored to your land, season and water availability.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Farm Details</CardTitle>
            <CardDescription>Fill in all fields for accurate recommendations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location (Village / District)</Label>
                <Input
                  id="location"
                  placeholder="e.g. Nashik, Maharashtra"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmSize">Farm Size (acres)</Label>
                <Input
                  id="farmSize"
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="e.g. 2.5"
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Soil Type</Label>
                <Select value={soil} onValueChange={setSoil}>
                  <SelectTrigger><SelectValue placeholder="Select soil" /></SelectTrigger>
                  <SelectContent>
                    {SOILS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Season</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Water Availability</Label>
                <Select value={water} onValueChange={setWater}>
                  <SelectTrigger><SelectValue placeholder="Select water level" /></SelectTrigger>
                  <SelectContent>
                    {WATER.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</> : "Get Recommendations"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {result?.recommendations && result.recommendations.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {result.recommendations.map((r, idx) => (
                <Card key={`${r.crop}-${idx}`} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Sprout className="h-5 w-5 text-primary" />
                          {r.crop}
                        </CardTitle>
                        {r.variety && (
                          <CardDescription className="mt-1">Variety: {r.variety}</CardDescription>
                        )}
                      </div>
                      <Badge variant="secondary">#{idx + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{r.expected_yield}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{r.growing_duration_days} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                        <Badge className={levelTone(r.water_requirement)} variant="secondary">
                          {r.water_requirement} water
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{r.estimated_profit_per_acre_inr}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge className={levelTone(r.profit_potential)} variant="secondary">
                        Profit: {r.profit_potential}
                      </Badge>
                      <Badge className={levelTone(
                        r.risk_level === "Low" ? "High" : r.risk_level === "High" ? "Low" : "Medium"
                      )} variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Risk: {r.risk_level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t">
                      <span className="font-medium text-foreground">Why this crop: </span>
                      {r.reasoning}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {result.general_advice && (
              <Card className="mt-6 border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">General Advice</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{result.general_advice}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {result && (!result.recommendations || result.recommendations.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No recommendations available for this combination. Try adjusting your inputs.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
