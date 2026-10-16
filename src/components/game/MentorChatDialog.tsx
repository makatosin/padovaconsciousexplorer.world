import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { chatWithMentorGeneral } from "@/lib/game.functions";
import { getDemoToken } from "@/lib/demo-token";
import { GalileoAvatar, useTalking } from "./Galileo";

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
        "Salve, esploratore! Sono Galileo Galilei: a Padova ho insegnato per diciotto anni, e la conosco come le lune di Giove. Chiedimi di un quartiere, di un parco nascosto o di una curiosità storica. 🔭",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReply = messages.length > 1 ? messages.length : null;
  const talking = useTalking(lastReply) || busy;

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
      const demoToken = getDemoToken();
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
            <GalileoAvatar className="size-12" talking={talking} />
            <span>
              Galileo
              <span className="block text-[11px] font-normal text-muted-foreground">
                La tua guida per Padova
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
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
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                  {m.content}
                </div>
              </div>
            ),
          )}
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
            placeholder="Fai una domanda a Galileo…"
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
