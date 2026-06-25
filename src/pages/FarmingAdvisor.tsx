import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Droplets, FlaskConical, Bug, Scissors, CalendarDays, Sparkles, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const TYPES = [
  { key: "daily", label: "Daily", Icon: Sparkles },
  { key: "weekly", label: "Weekly", Icon: CalendarDays },
  { key: "irrigation", label: "Irrigation", Icon: Droplets },
  { key: "fertilizer", label: "Fertilizer", Icon: FlaskConical },
  { key: "pest", label: "Pest", Icon: Bug },
  { key: "harvest", label: "Harvest", Icon: Scissors },
] as const;

interface AdviceItem { title: string; action: string; why: string; priority: "high"|"medium"|"low"; timing?: string; }
interface Advice { summary: string; items: AdviceItem[]; warnings?: string[]; }
interface HistoryRow {
  id: string; advice_type: string; crop: string | null; crop_stage: string | null;
  created_at: string; payload: Advice;
}

const FarmingAdvisor = () => {
  const [type, setType] = useState<typeof TYPES[number]["key"]>("daily");
  const [crop, setCrop] = useState("");
  const [stage, setStage] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("farming_advice")
      .select("id,advice_type,crop,crop_stage,created_at,payload")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistoryLoading(false);
    if (error) return;
    setHistory(((data as unknown) as HistoryRow[]) ?? []);
  };

  useEffect(() => { loadHistory(); }, []);

  const generate = async () => {
    if (loading) return;
    setLoading(true); setAdvice(null);
    try {
      const { data, error } = await supabase.functions.invoke("farming-advisor", {
        body: { advice_type: type, crop, crop_stage: stage, language },
      });
      if (error) throw error;
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      setAdvice((data as any).advice);
      loadHistory();
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate advice");
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (p: string) =>
    p === "high" ? "destructive" : p === "medium" ? "default" : "secondary";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Sprout className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Farming Advisor</h1>
            <p className="text-muted-foreground text-sm">
              Recommendations grounded in your latest weather data. Every "why" cites a real observation.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Generate advice</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 grid-cols-2 md:grid-cols-6">
              {TYPES.map(({ key, label, Icon }) => (
                <Button
                  key={key} type="button"
                  variant={type === key ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setType(key)}
                >
                  <Icon className="h-4 w-4 mr-2" /> {label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Crop (optional, e.g. Tomato)" value={crop} onChange={(e) => setCrop(e.target.value)} />
              <Input placeholder="Crop stage (e.g. flowering)" value={stage} onChange={(e) => setStage(e.target.value)} />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">हिन्दी</SelectItem>
                  <SelectItem value="Marathi">मराठी</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? "Analyzing weather data…" : "Generate advice"}
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <Card><CardContent className="pt-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 border rounded p-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </CardContent></Card>
        )}

        {advice && (
          <Card>
            <CardHeader>
              <CardTitle>Today's recommendations</CardTitle>
              <CardDescription>{advice.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {advice.warnings?.length ? (
                <div className="space-y-2">
                  {advice.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <span className="text-sm">{w}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {advice.items.map((it, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{it.title}</h4>
                      <Badge variant={priorityColor(it.priority) as any}>{it.priority}</Badge>
                    </div>
                    <p className="text-sm">{it.action}</p>
                    <p className="text-xs text-muted-foreground"><strong>Why:</strong> {it.why}</p>
                    {it.timing && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {it.timing}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {historyLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-muted-foreground">No previous advice yet.</p>
            )}
            {history.map((h) => {
              const open = openId === h.id;
              return (
                <div key={h.id} className="border rounded">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                    onClick={() => setOpenId(open ? null : h.id)}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="capitalize">{h.advice_type}</Badge>
                      <span className="font-medium">{h.crop || "General"}</span>
                      {h.crop_stage && <span className="text-muted-foreground">· {h.crop_stage}</span>}
                      <span className="text-muted-foreground">· {new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {open && (
                    <div className="p-3 border-t space-y-2 text-sm">
                      <p className="text-muted-foreground">{h.payload?.summary}</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {h.payload?.items?.slice(0, 8).map((it, i) => (
                          <li key={i}><strong>{it.title}:</strong> {it.action} <em className="text-muted-foreground">— {it.why}</em></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmingAdvisor;
