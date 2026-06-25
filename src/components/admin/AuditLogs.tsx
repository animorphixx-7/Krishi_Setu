import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface LogRow {
  id: string;
  user_id: string;
  event_type: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

const EVENT_TYPES = [
  "all", "login", "logout", "profile_updated",
  "crop_recommendation_generated", "disease_scan",
  "ai_conversation_started", "farming_advice_requested",
];

export default function AuditLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("activity_logs")
      .select("id, user_id, event_type, description, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") query = query.eq("event_type", filter);
    const { data } = await query;
    const list = (data || []) as LogRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((l) => l.user_id))).filter(Boolean);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const m: Record<string, string> = {};
      (profs || []).forEach((p: any) => { m[p.id] = p.full_name; });
      setNames(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return (r.description || "").toLowerCase().includes(t)
      || (names[r.user_id] || "").toLowerCase().includes(t)
      || r.event_type.toLowerCase().includes(t);
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <CardTitle>Audit Logs</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Search description, user, type…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-72" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{names[r.user_id] || r.user_id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{r.event_type}</Badge></TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No logs match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
