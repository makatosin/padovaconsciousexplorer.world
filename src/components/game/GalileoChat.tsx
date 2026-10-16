import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Suggestion } from "@/lib/galileo-brain";
import { GalileoAvatar } from "./GalileoAvatar";

type Msg = { role: "user" | "assistant"; content: string };

// Pausa prima della risposta: Galileo "pensa" un attimo, così la conversazione sembra
// naturale anche se le risposte sono già pronte sul telefono.
const THINKING_MS = 700;

export function GalileoChat({
  intro,
  suggestions,
  answer,
  onTalkingChange,
  className = "",
}: {
  intro: string;
  suggestions: Suggestion[];
  answer: (question: string) => string;
  onTalkingChange?: (talking: boolean) => void;
  className?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: intro }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    onTalkingChange?.(busy);
  }, [busy, onTalkingChange]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: answer(q) }]);
      setBusy(false);
    }, THINKING_MS);
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-8 rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-6 flex items-end gap-2">
              <GalileoAvatar className="size-7" />
              <div className="whitespace-pre-line rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                {m.content}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="mr-6 flex items-end gap-2">
            <GalileoAvatar className="size-7" talking />
            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
              …
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => ask(s.question)}
            disabled={busy}
            className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="Fai una domanda a Galileo…"
          rows={1}
          maxLength={300}
          className="min-h-10 resize-none"
        />
        <Button size="icon" onClick={() => ask(input)} disabled={busy || !input.trim()} aria-label="Invia">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
