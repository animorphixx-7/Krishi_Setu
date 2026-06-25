import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Bucket { label: string; items: { id: string; title: string; sub?: string; when?: string }[] }

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);

  const run = async () => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    const like = `%${term}%`;
    const [users, recs, scans, chats, advice] = await Promise.all([
      supabase.from("profiles").select("id, full_name, district, role").or(`full_name.ilike.${like},district.ilike.${like}`).limit(20),
      supabase.from("crop_recommendations").select("id, top_crop, district, season, created_at").or(`top_crop.ilike.${like},district.ilike.${like},season.ilike.${like}`).order("created_at", { ascending: false }).limit(20),
      supabase.from("disease_scans").select("id, plant_name, disease_name, health_status, created_at").or(`plant_name.ilike.${like},disease_name.ilike.${like}`).order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_conversations").select("id, title, language, last_message_at").ilike("title", like).order("last_message_at", { ascending: false }).limit(20),
      supabase.from("farming_advice").select("id, advice_type, crop, district, created_at").or(`crop.ilike.${like},district.ilike.${like},advice_type.ilike.${like}`).order("created_at", { ascending: false }).limit(20),
    ]);

    setBuckets([
      { label: "Users", items: (users.data || []).map((u: any) => ({ id: u.id, title: u.full_name, sub: `${u.role} · ${u.district || "—"}` })) },
      { label: "Crop Recommendations", items: (recs.data || []).map((r: any) => ({ id: r.id, title: r.top_crop || "—", sub: `${r.district} · ${r.season}`, when: r.created_at })) },
      { label: "Disease Scans", items: (scans.data || []).map((s: any) => ({ id: s.id, title: `${s.plant_name || "?"} — ${s.disease_name || "healthy"}`, sub: s.health_status, when: s.created_at })) },
      { label: "AI Conversations", items: (chats.data || []).map((c: any) => ({ id: c.id, title: c.title, sub: c.language, when: c.last_message_at })) },
      { label: "Farming Advice", items: (advice.data || []).map((a: any) => ({ id: a.id, title: `${a.advice_type} · ${a.crop}`, sub: a.district, when: a.created_at })) },
    ]);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Search</CardTitle>
        <div className="flex gap-2 pt-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Search users, recommendations, scans, chats, advice…" />
          <Button onClick={run} disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {!loading && buckets.length === 0 && <p className="text-muted-foreground text-sm">Type a term and hit Enter.</p>}
        {!loading && buckets.map((b) => (
          <div key={b.label}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground">{b.label}</h3>
              <Badge variant="secondary">{b.items.length}</Badge>
            </div>
            {b.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matches.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {b.items.map((it) => (
                  <li key={it.id} className="px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <div className="font-medium">{it.title}</div>
                      {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                    </div>
                    {it.when && <div className="text-xs text-muted-foreground">{new Date(it.when).toLocaleString()}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
