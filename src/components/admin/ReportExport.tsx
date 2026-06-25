import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV, downloadPDF, downloadXLSX, Row } from "@/lib/reports";
import { Download, FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";

type ReportType =
  | "farmer_activity"
  | "ai_recommendations"
  | "disease_scans"
  | "weather_usage"
  | "ai_chats"
  | "farming_advice"
  | "platform_analytics";

const REPORTS: { value: ReportType; label: string }[] = [
  { value: "farmer_activity", label: "Farmer Activity (activity_logs)" },
  { value: "ai_recommendations", label: "AI Crop Recommendations" },
  { value: "disease_scans", label: "Disease Scans" },
  { value: "weather_usage", label: "Weather Usage (cache)" },
  { value: "ai_chats", label: "AI Chat Sessions" },
  { value: "farming_advice", label: "Farming Advice" },
  { value: "platform_analytics", label: "Platform Analytics Summary" },
];

export default function ReportExport() {
  const { toast } = useToast();
  const [type, setType] = useState<ReportType>("farmer_activity");
  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [district, setDistrict] = useState("");
  const [crop, setCrop] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Row[]>([]);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const fromIso = () => `${from}T00:00:00Z`;
  const toIso = () => `${to}T23:59:59Z`;

  async function loadRows(): Promise<Row[]> {
    switch (type) {
      case "farmer_activity": {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("created_at, user_id, event_type, description, metadata")
          .gte("created_at", fromIso())
          .lte("created_at", toIso())
          .order("created_at", { ascending: false })
          .limit(5000);
        if (error) throw error;
        return (data ?? []).map((r) => ({
          timestamp: r.created_at,
          user_id: r.user_id ?? "",
          event_type: r.event_type,
          description: r.description ?? "",
          metadata: r.metadata ? JSON.stringify(r.metadata) : "",
        }));
      }
      case "ai_recommendations": {
        let q = supabase.from("crop_recommendations")
          .select("created_at, user_id, district, season, top_crop, recommendations")
          .gte("created_at", fromIso()).lte("created_at", toIso())
          .order("created_at", { ascending: false }).limit(5000);
        if (district) q = q.ilike("district", `%${district}%`);
        if (crop) q = q.ilike("top_crop", `%${crop}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r) => ({
          timestamp: r.created_at,
          user_id: r.user_id,
          district: r.district ?? "",
          season: r.season ?? "",
          top_crop: r.top_crop ?? "",
        }));
      }
      case "disease_scans": {
        let q = supabase.from("disease_scans")
          .select("created_at, user_id, plant_name, disease_name, health_status, confidence")
          .gte("created_at", fromIso()).lte("created_at", toIso())
          .order("created_at", { ascending: false }).limit(5000);
        if (crop) q = q.ilike("plant_name", `%${crop}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r) => ({
          timestamp: r.created_at,
          user_id: r.user_id,
          plant: r.plant_name ?? "",
          disease: r.disease_name ?? "",
          health: r.health_status ?? "",
          confidence: r.confidence ?? "",
        }));
      }
      case "weather_usage": {
        let q = supabase.from("weather_cache")
          .select("created_at, location_key, latitude, longitude, fetched_at, expires_at")
          .gte("created_at", fromIso()).lte("created_at", toIso())
          .order("created_at", { ascending: false }).limit(5000);
        if (district) q = q.ilike("location_key", `%${district.toLowerCase()}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r) => ({
          created_at: r.created_at,
          location_key: r.location_key,
          latitude: r.latitude,
          longitude: r.longitude,
          fetched_at: r.fetched_at,
          expires_at: r.expires_at,
        }));
      }
      case "ai_chats": {
        const { data, error } = await supabase.from("ai_conversations")
          .select("created_at, updated_at, user_id, title, language, last_message_at")
          .gte("created_at", fromIso()).lte("created_at", toIso())
          .order("created_at", { ascending: false }).limit(5000);
        if (error) throw error;
        return (data ?? []).map((r) => ({
          created_at: r.created_at,
          user_id: r.user_id,
          title: r.title ?? "",
          language: r.language ?? "",
          last_message_at: r.last_message_at ?? "",
        }));
      }
      case "farming_advice": {
        let q = supabase.from("farming_advice")
          .select("created_at, user_id, advice_type, crop, crop_stage, district")
          .gte("created_at", fromIso()).lte("created_at", toIso())
          .order("created_at", { ascending: false }).limit(5000);
        if (district) q = q.ilike("district", `%${district}%`);
        if (crop) q = q.ilike("crop", `%${crop}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r) => ({
          timestamp: r.created_at,
          user_id: r.user_id,
          advice_type: r.advice_type,
          crop: r.crop ?? "",
          crop_stage: r.crop_stage ?? "",
          district: r.district ?? "",
        }));
      }
      case "platform_analytics": {
        const [users, recs, scans, chats, advice, weather] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("crop_recommendations").select("id", { count: "exact", head: true })
            .gte("created_at", fromIso()).lte("created_at", toIso()),
          supabase.from("disease_scans").select("id", { count: "exact", head: true })
            .gte("created_at", fromIso()).lte("created_at", toIso()),
          supabase.from("ai_conversations").select("id", { count: "exact", head: true })
            .gte("created_at", fromIso()).lte("created_at", toIso()),
          supabase.from("farming_advice").select("id", { count: "exact", head: true })
            .gte("created_at", fromIso()).lte("created_at", toIso()),
          supabase.from("weather_cache").select("id", { count: "exact", head: true })
            .gte("created_at", fromIso()).lte("created_at", toIso()),
        ]);
        return [
          { metric: "Total Farmers (all-time)", value: users.count ?? 0 },
          { metric: "Crop Recommendations (range)", value: recs.count ?? 0 },
          { metric: "Disease Scans (range)", value: scans.count ?? 0 },
          { metric: "AI Conversations (range)", value: chats.count ?? 0 },
          { metric: "Farming Advice (range)", value: advice.count ?? 0 },
          { metric: "Weather Cache Entries (range)", value: weather.count ?? 0 },
        ];
      }
    }
  }

  const handlePreview = async () => {
    setBusy(true);
    try {
      const rows = await loadRows();
      setPreview(rows);
      setPreviewLoaded(true);
      toast({ title: "Preview ready", description: `${rows.length} records loaded.` });
    } catch (e) {
      toast({ title: "Failed to load report", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (fmt: "csv" | "xlsx" | "pdf") => {
    setBusy(true);
    try {
      const rows = previewLoaded ? preview : await loadRows();
      const label = REPORTS.find((r) => r.value === type)?.label ?? type;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `krishi-setu_${type}_${from}_${to}_${stamp}`;
      const meta = [
        `Report: ${label}`,
        `Range: ${from} → ${to}`,
        district ? `District filter: ${district}` : "",
        crop ? `Crop filter: ${crop}` : "",
        `Records: ${rows.length}`,
      ].filter(Boolean);

      if (fmt === "csv") downloadCSV(filename, rows);
      else if (fmt === "xlsx") downloadXLSX(filename, rows, label);
      else downloadPDF(filename, `Krishi Setu AI — ${label}`, meta, rows);
      toast({ title: "Export ready", description: `${rows.length} rows exported as ${fmt.toUpperCase()}.` });
    } catch (e) {
      toast({ title: "Export failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const showsDistrict = ["ai_recommendations", "weather_usage", "farming_advice"].includes(type);
  const showsCrop = ["ai_recommendations", "disease_scans", "farming_advice"].includes(type);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Report</Label>
              <Select value={type} onValueChange={(v) => { setType(v as ReportType); setPreviewLoaded(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORTS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreviewLoaded(false); }} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreviewLoaded(false); }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {showsDistrict && (
                <div className="space-y-1">
                  <Label>District</Label>
                  <Input placeholder="e.g. Pune" value={district} onChange={(e) => { setDistrict(e.target.value); setPreviewLoaded(false); }} />
                </div>
              )}
              {showsCrop && (
                <div className="space-y-1">
                  <Label>Crop / Plant</Label>
                  <Input placeholder="e.g. Tomato" value={crop} onChange={(e) => { setCrop(e.target.value); setPreviewLoaded(false); }} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handlePreview} disabled={busy} variant="outline">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Load Preview
            </Button>
            <Button onClick={() => handleExport("csv")} disabled={busy}>
              <FileText className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button onClick={() => handleExport("xlsx")} disabled={busy} variant="secondary">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button onClick={() => handleExport("pdf")} disabled={busy} variant="secondary">
              <FileType className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewLoaded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview — {preview.length} records</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records match the selected filters.</p>
            ) : (
              <table className="text-xs w-full">
                <thead className="border-b">
                  <tr>
                    {Object.keys(preview[0]).map((k) => (
                      <th key={k} className="text-left p-2 font-medium">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-b">
                      {Object.keys(preview[0]).map((k) => (
                        <td key={k} className="p-2 align-top max-w-[240px] truncate">{String(r[k] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {preview.length > 25 && (
              <p className="text-xs text-muted-foreground mt-2">Showing first 25 rows. Export to see all {preview.length}.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
