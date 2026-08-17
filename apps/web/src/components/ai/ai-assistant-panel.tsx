"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { apiClient } from "@/lib/api-client";
import { useUiStore } from "@/store/ui-store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quels sont mes meilleurs prospects ?",
  "Qui dois-je appeler aujourd'hui ?",
  "Quels clients perdent de l'argent ?",
  "Quels clients n'ont pas été relancés depuis 30 jours ?",
  "Quels prospects ont un fort potentiel logistique ?",
  "Qui possède un entrepôt de plus de 5 000 m² ?",
  "Quels clients font plus de 20 M€ de CA ?",
  "Quels dirigeants n'ont jamais été contactés ?",
];

export function AiAssistantPanel() {
  const open = useUiStore((s) => s.aiPanelOpen);
  const setOpen = useUiStore((s) => s.setAiPanelOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Je suis l'assistant IA commercial de Gecodis. Posez-moi une question sur vos prospects, clients ou opportunités.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (question: string) => (await apiClient.post("/ai/assistant/ask", { question })).data,
    onSuccess: (data) => setMessages((m) => [...m, { role: "assistant", content: data.answer }]),
    onError: () =>
      setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue. Réessayez." }]),
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
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand text-brand-foreground shadow-popover flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Assistant IA"
      >
        <Sparkles size={22} />
      </button>

      <div
        className={clsx(
          "fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] card flex flex-col shadow-popover transition-all duration-200 origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
        )}
        style={{ height: 520 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 font-medium text-ink">
            <Sparkles size={16} className="text-brand" /> IA commerciale
          </div>
          <button onClick={() => setOpen(false)} className="btn-ghost !p-1.5">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={clsx(
                "text-sm rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                m.role === "user" ? "bg-brand text-brand-foreground ml-auto" : "bg-canvas text-ink",
              )}
            >
              {m.content}
            </div>
          ))}
          {ask.isPending && <div className="text-sm text-ink-faint px-1">L'assistant réfléchit…</div>}

          {messages.length <= 1 && (
            <div className="grid grid-cols-1 gap-1.5 pt-2">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border-subtle text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 p-3 border-t border-border-subtle"
        >
          <input
            className="input"
            placeholder="Posez votre question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary !px-3" disabled={ask.isPending}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}
