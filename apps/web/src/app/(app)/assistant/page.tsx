"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Send } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PageHeader, Card } from "@/components/ui/misc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Posez-moi n'importe quelle question sur vos prospects, clients, pipeline ou rentabilité." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: capabilities } = useQuery({
    queryKey: ["assistant-capabilities"],
    queryFn: async () => (await apiClient.get("/ai/assistant/capabilities")).data,
  });

  const ask = useMutation({
    mutationFn: async (question: string) => (await apiClient.post("/ai/assistant/ask", { question })).data,
    onSuccess: (data) => setMessages((m) => [...m, { role: "assistant", content: data.answer }]),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, ask.isPending]);

  function send(question: string) {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    ask.mutate(question);
  }

  return (
    <div>
      <PageHeader title="Assistant IA commercial" description="Interrogez votre CRM en langage naturel." />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 flex flex-col p-0 h-[600px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-4 py-2.5 max-w-[75%] whitespace-pre-wrap ${
                  m.role === "user" ? "bg-brand text-brand-foreground ml-auto" : "bg-canvas text-ink"
                }`}
              >
                {m.content}
              </div>
            ))}
            {ask.isPending && <div className="text-sm text-ink-faint">L'assistant réfléchit…</div>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 p-4 border-t border-border-subtle"
          >
            <input className="input" placeholder="Posez votre question…" value={input} onChange={(e) => setInput(e.target.value)} />
            <button type="submit" className="btn-primary !px-4" disabled={ask.isPending}>
              <Send size={16} />
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-brand" /> Questions suggérées
          </h3>
          <div className="space-y-1.5">
            {capabilities?.map((c: any) => (
              <button
                key={c.key}
                onClick={() => send(c.description)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border-subtle text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                {c.description}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
