import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { chatWithMentorGeneral } from "@/lib/game.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function MentorChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const chatFn = useServerFn(chatWithMentorGeneral);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ciao esploratore! Sono il tuo Mentore Storico di Padova. Chiedimi di un quartiere periferico, un parco nascosto o una curiosità storica. 🌿",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      let demoToken: string | undefined;
      try {
        demoToken = sessionStorage.getItem("pce-demo-token") ?? undefined;
      } catch {}
      const res = await chatFn({ data: { history: messages, userMessage: text, demoToken } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1500] flex h-[85vh] max-w-md flex-col p-0 sm:h-[80vh]">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Mentore Storico
          </DialogTitle>
        </DialogHeader>
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-8 bg-primary text-primary-foreground"
                  : "mr-8 bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="mr-8 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              …
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-border/60 p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Fai una domanda al mentore…"
            rows={1}
            className="min-h-10 resize-none"
            disabled={busy}
          />
          <Button size="icon" onClick={send} disabled={busy || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}