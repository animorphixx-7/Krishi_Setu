import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Sprout, Stethoscope, MessagesSquare, Lightbulb, CloudSun, Users } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(var(--destructive))",
  "hsl(217 91% 60%)",
  "hsl(280 70% 55%)",
];

type Row = { created_at: string; [k: string]: any };

function bucketByDay(rows: Row[], days = 14) {
  const today = new Date();
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  rows.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([date, count]) => ({ date: date.slice(5), count }));
}

function topN(rows: { key: string | null | undefined }[], n = 6) {
  const c: Record<string, number> = {};
  rows.forEach((r) => {
    const k = (r.key || "Unknown").toString().trim() || "Unknown";
    c[k] = (c[k] || 0) + 1;
  });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
}

export default function PlatformAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    profiles: any[]; recs: any[]; scans: any[]; chats: any[]; advice: any[]; weather: any[]; logins: any[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const [profiles, recs, scans, chats, advice, weather, logins] = await Promise.all([
          supabase.from("profiles").select("id, district, role, created_at"),
          supabase.from("crop_recommendations").select("created_at, top_crop, district, season").gte("created_at", since),
          supabase.from("disease_scans").select("created_at, plant_name, disease_name, health_status").gte("created_at", since),
          supabase.from("ai_conversations").select("created_at, language").gte("created_at", since),
          supabase.from("farming_advice").select("created_at, advice_type, district").gte("created_at", since),
          supabase.from("weather_cache").select("created_at, location_key").gte("created_at", since),
          supabase.from("activity_logs").select("created_at, user_id, event_type").eq("event_type", "login").gte("created_at", since),
        ]);
        setData({
          profiles: profiles.data || [],
          recs: recs.data || [],
          scans: scans.data || [],
          chats: chats.data || [],
          advice: advice.data || [],
          weather: weather.data || [],
          logins: logins.data || [],
        });
      } finally { setLoading(false); }
    })();
  }, []);

  const charts = useMemo(() => {
    if (!data) return null;
    const dailyLogins = bucketByDay(data.logins);
    const dau = new Set(data.logins.filter((l) => l.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).map((l) => l.user_id)).size;
    const topCrops = topN(data.recs.map((r) => ({ key: r.top_crop })));
    const topDiseases = topN(data.scans.filter((s) => s.disease_name).map((s) => ({ key: s.disease_name })));
    const districtUsage = topN([
      ...data.recs.map((r) => ({ key: r.district })),
      ...data.advice.map((a) => ({ key: a.district })),
    ], 8);
    const userGrowth = bucketByDay(data.profiles, 30);
    const moduleUsage = [
      { name: "Recommendations", value: data.recs.length },
      { name: "Disease scans", value: data.scans.length },
      { name: "AI chats", value: data.chats.length },
      { name: "Advice", value: data.advice.length },
      { name: "Weather", value: data.weather.length },
    ];
    return { dailyLogins, dau, topCrops, topDiseases, districtUsage, userGrowth, moduleUsage };
  }, [data]);

  if (loading || !charts || !data) {
    return <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  const kpis = [
    { label: "Total Farmers", value: data.profiles.filter((p) => p.role === "farmer").length, icon: Users },
    { label: "Active Users (30d)", value: new Set(data.logins.map((l) => l.user_id)).size, icon: Users },
    { label: "Daily Active (today)", value: charts.dau, icon: Users },
    { label: "AI Recommendations", value: data.recs.length, icon: Sprout },
    { label: "Disease Scans", value: data.scans.length, icon: Stethoscope },
    { label: "AI Chat Sessions", value: data.chats.length, icon: MessagesSquare },
    { label: "Advice Requests", value: data.advice.length, icon: Lightbulb },
    { label: "Weather Requests", value: data.weather.length, icon: CloudSun },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{k.value.toLocaleString()}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily Logins (14 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><LineChart data={charts.dailyLogins}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>User Growth (30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><LineChart data={charts.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(142 76% 36%)" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Popular Crops (recommended)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><BarChart data={charts.topCrops}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Most Detected Diseases</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><BarChart data={charts.topDiseases}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="value" fill="hsl(var(--destructive))" />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>District-wise Usage</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><BarChart data={charts.districtUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={90} /><Tooltip />
              <Bar dataKey="value" fill="hsl(38 92% 50%)" />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI Module Usage Mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer><PieChart>
              <Pie data={charts.moduleUsage} dataKey="value" nameKey="name" outerRadius={90} label>
                {charts.moduleUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend />
            </PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
