import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadPDF } from "@/lib/reports";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, PlayCircle, FileDown } from "lucide-react";

type Outcome = "pass" | "fail" | "warn" | "pending";

interface TestResult {
  name: string;
  category: string;
  outcome: Outcome;
  detail: string;
  ms?: number;
}

async function run<T>(name: string, category: string, fn: () => Promise<{ outcome: Outcome; detail: string }>): Promise<TestResult> {
  const t0 = performance.now();
  try {
    const r = await fn();
    return { name, category, ...r, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { name, category, outcome: "fail", detail: String((e as Error).message), ms: Math.round(performance.now() - t0) };
  }
}

export default function TestingSuite() {
  const { toast } = useToast();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const out: TestResult[] = [];

    // 1. Auth — session present
    out.push(await run("Active session", "Authentication", async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { outcome: "fail", detail: error.message };
      return data.session
        ? { outcome: "pass", detail: `User ${data.session.user.email ?? data.session.user.id}` }
        : { outcome: "warn", detail: "No active session in this browser" };
    }));

    // 2. Authorization — admin RPC
    out.push(await run("Admin role check (has_role)", "Authorization", async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { outcome: "warn", detail: "Skipped — not signed in" };
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: data ? "pass" : "warn", detail: data ? "Is admin" : "Not admin" };
    }));

    // 3. DB ops — read profiles
    out.push(await run("Read profiles (RLS)", "Database", async () => {
      const { error, count } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: `${count ?? 0} rows visible under current RLS` };
    }));

    // 4. Weather edge function exists (don't invoke spend)
    out.push(await run("Weather cache present", "Weather Module", async () => {
      const { count, error } = await supabase.from("weather_cache").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: (count ?? 0) > 0 ? "pass" : "warn", detail: `${count ?? 0} cached forecasts` };
    }));

    // 5. Crop recommendation history reachable
    out.push(await run("crop_recommendations table reachable", "Crop Recommendation", async () => {
      const { error, count } = await supabase.from("crop_recommendations").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: `${count ?? 0} recommendations stored` };
    }));

    // 6. Disease detection history
    out.push(await run("disease_scans table reachable", "Disease Detection", async () => {
      const { error, count } = await supabase.from("disease_scans").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: `${count ?? 0} scans stored` };
    }));

    // 7. AI chat tables
    out.push(await run("ai_conversations + ai_messages reachable", "AI Chat", async () => {
      const a = await supabase.from("ai_conversations").select("id", { head: true, count: "exact" });
      const b = await supabase.from("ai_messages").select("id", { head: true, count: "exact" });
      if (a.error) return { outcome: "fail", detail: a.error.message };
      if (b.error) return { outcome: "fail", detail: b.error.message };
      return { outcome: "pass", detail: `${a.count ?? 0} chats / ${b.count ?? 0} messages` };
    }));

    // 8. Farming advice
    out.push(await run("farming_advice reachable", "Farming Advisor", async () => {
      const { error, count } = await supabase.from("farming_advice").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: `${count ?? 0} advice records` };
    }));

    // 9. Audit logs
    out.push(await run("activity_logs reachable", "Audit Logs", async () => {
      const { error, count } = await supabase.from("activity_logs").select("id", { head: true, count: "exact" });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: `${count ?? 0} log entries` };
    }));

    // 10. Storage bucket
    out.push(await run("Storage bucket equipment-images", "Storage", async () => {
      const { error } = await supabase.storage.from("equipment-images").list("", { limit: 1 });
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: "pass", detail: "Bucket reachable" };
    }));

    // 11. Navigation — basic route count
    out.push(await run("Client routes registered", "Navigation", async () => {
      const links = Array.from(document.querySelectorAll("a[href^='/']")).map((a) => (a as HTMLAnchorElement).pathname);
      const unique = Array.from(new Set(links));
      return { outcome: unique.length >= 5 ? "pass" : "warn", detail: `${unique.length} internal links found in DOM` };
    }));

    // 12. Error handling — invalid table should fail gracefully
    out.push(await run("Graceful error on bad table", "Error Handling", async () => {
      const { error } = await supabase.from("__no_such_table__" as never).select("*");
      return error ? { outcome: "pass", detail: "Error returned without exception" }
                   : { outcome: "warn", detail: "Expected error, got none" };
    }));

    // 13. API failure handling — bogus RPC
    out.push(await run("Graceful error on bad RPC", "API Failures", async () => {
      const { error } = await supabase.rpc("__nope__" as never);
      return error ? { outcome: "pass", detail: "RPC error surfaced" } : { outcome: "warn", detail: "Expected error, got none" };
    }));

    // 14. Responsive layout — viewport detection
    out.push(await run("Viewport detected", "Responsive Layout", async () => {
      const w = window.innerWidth;
      return { outcome: "pass", detail: `width=${w}px (${w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop"})` };
    }));

    // 15. Accessibility — img alt coverage
    out.push(await run("Image alt-text coverage", "Accessibility", async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const missing = imgs.filter((i) => !i.alt && !i.getAttribute("aria-hidden"));
      if (imgs.length === 0) return { outcome: "warn", detail: "No <img> elements on this view" };
      const pct = ((imgs.length - missing.length) / imgs.length) * 100;
      return { outcome: pct >= 90 ? "pass" : "warn", detail: `${pct.toFixed(0)}% of ${imgs.length} images have alt text` };
    }));

    // 16. Edge case — empty range query
    out.push(await run("Empty-range query returns []", "Edge Cases", async () => {
      const { data, error } = await supabase.from("activity_logs").select("id")
        .gte("created_at", "1900-01-01").lte("created_at", "1900-01-02");
      if (error) return { outcome: "fail", detail: error.message };
      return { outcome: (data?.length ?? 0) === 0 ? "pass" : "warn", detail: `rows=${data?.length ?? 0}` };
    }));

    setResults(out);
    setRunning(false);
    const pass = out.filter((r) => r.outcome === "pass").length;
    const fail = out.filter((r) => r.outcome === "fail").length;
    toast({ title: "Tests complete", description: `${pass}/${out.length} passed, ${fail} failed.` });
  };

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.outcome === "pass").length,
    fail: results.filter((r) => r.outcome === "fail").length,
    warn: results.filter((r) => r.outcome === "warn").length,
  };

  const exportReport = () => {
    if (results.length === 0) {
      toast({ title: "Run tests first", variant: "destructive" }); return;
    }
    const rows = results.map((r) => ({
      category: r.category, name: r.name, outcome: r.outcome, detail: r.detail, ms: r.ms ?? "",
    }));
    const meta = [
      `Total: ${summary.total}`,
      `Passed: ${summary.pass}`,
      `Failed: ${summary.fail}`,
      `Warnings: ${summary.warn}`,
      `Coverage: Not measured (no static-analysis instrumentation).`,
    ];
    downloadPDF(
      `krishi-setu_test-report_${new Date().toISOString().slice(0, 10)}`,
      "Krishi Setu AI — Test Report",
      meta,
      rows,
    );
  };

  const icon = (o: Outcome) => o === "pass" ? <CheckCircle2 className="h-4 w-4 text-green-600" />
    : o === "fail" ? <XCircle className="h-4 w-4 text-red-600" />
    : o === "warn" ? <AlertTriangle className="h-4 w-4 text-amber-600" />
    : <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integration Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Runs read-only checks against the live database, auth, RLS, storage, and UI surface.
            Results are measured — never fabricated. Coverage % is not reported because no static
            instrumentation runs at this layer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAll} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Run all tests
            </Button>
            <Button onClick={exportReport} variant="outline" disabled={results.length === 0}>
              <FileDown className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          </div>

          {results.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline">Total: {summary.total}</Badge>
              <Badge className="bg-green-600 hover:bg-green-700">Pass: {summary.pass}</Badge>
              <Badge variant="destructive">Fail: {summary.fail}</Badge>
              <Badge className="bg-amber-500 hover:bg-amber-600">Warn: {summary.warn}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="text-sm w-full">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left p-3 w-10"></th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Test</th>
                  <th className="text-left p-3">Detail</th>
                  <th className="text-right p-3 w-20">ms</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-3">{icon(r.outcome)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.category}</td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-xs">{r.detail}</td>
                    <td className="p-3 text-right text-xs text-muted-foreground">{r.ms ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
