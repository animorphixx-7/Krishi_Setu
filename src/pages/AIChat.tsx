import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Send, Plus, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";
interface Msg { id?: string; role: Role; content: string; }
interface Conv { id: string; title: string; language: string; last_message_at: string; }

const LANGS = ["English", "Hindi", "Marathi"];

const AIChat = () => {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const inFlight = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id,title,language,last_message_at")
      .order("last_message_at", { ascending: false });
    setLoadingConvs(false);
    if (error) { toast.error("Failed to load conversations"); return; }
    setConversations((data as Conv[]) ?? []);
    if (!activeId && data && data.length > 0) selectConversation(data[0].id, data[0].language);
  };

  const loadMessages = async (id: string) => {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id,role,content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setLoadingMsgs(false);
    if (error) { toast.error("Failed to load messages"); return; }
    setMessages((data as Msg[]) ?? []);
  };

  const selectConversation = (id: string, lang?: string) => {
    setActiveId(id);
    if (lang) setLanguage(lang);
    loadMessages(id);
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    if (activeId === id) newConversation();
    loadConversations();
  };

  useEffect(() => { loadConversations(); /* eslint-disable-next-line */ }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || inFlight.current) return;
    inFlight.current = true;
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in"); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text, conversation_id: activeId, language }),
      });

      if (!res.ok || !res.body) {
        let msg = `Request failed (${res.status})`;
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const convId = res.headers.get("X-Conversation-Id");
      if (convId && !activeId) setActiveId(convId);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let leftover = "";
      let assistant = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = leftover + dec.decode(value, { stream: true });
        const lines = chunk.split("\n");
        leftover = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const p = t.slice(5).trim();
          if (p === "[DONE]") continue;
          try {
            const j = JSON.parse(p);
            const delta = j.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
      loadConversations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Chat failed");
      setMessages((m) => {
        const copy = [...m];
        if (copy.length && copy[copy.length - 1].role === "assistant" && !copy[copy.length - 1].content) copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
      inFlight.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6">
        <div className="flex items-center gap-3 mb-6">
          <Bot className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">AI Farming Assistant</h1>
            <p className="text-muted-foreground text-sm">
              Grounded in your real weather, market prices, and profile data. English · हिन्दी · मराठी
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Conversation list */}
          <Card className="h-[70vh] flex flex-col">
            <div className="p-3 border-b flex gap-2">
              <Button size="sm" className="w-full" onClick={newConversation}>
                <Plus className="h-4 w-4 mr-2" /> New chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingConvs && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              {!loadingConvs && conversations.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded px-2 py-2 cursor-pointer hover:bg-accent",
                    activeId === c.id && "bg-accent"
                  )}
                  onClick={() => selectConversation(c.id, c.language)}
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{c.title}</span>
                  <button
                    type="button"
                    aria-label="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Chat panel */}
          <Card className="h-[70vh] flex flex-col">
            <div className="p-3 border-b flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {activeId ? "Conversation in progress" : "Start a new conversation"}
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMsgs && <>
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-1/2 ml-auto" />
                <Skeleton className="h-16 w-2/3" />
              </>}
              {!loadingMsgs && messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-60" />
                  <p>Ask about crops, weather impact, schemes, or market prices.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" ? (
                    <div className="max-w-[85%] prose prose-sm dark:prose-invert">
                      {m.content
                        ? <ReactMarkdown>{m.content}</ReactMarkdown>
                        : <span className="inline-flex items-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Thinking…</span>}
                    </div>
                  ) : (
                    <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder={`Type in ${language}... (Shift+Enter for newline)`}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  disabled={streaming}
                />
                <Button onClick={send} disabled={streaming || !input.trim()}>
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
