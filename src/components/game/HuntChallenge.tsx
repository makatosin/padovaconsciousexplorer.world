import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GalileoBubble, HintButton } from "@/components/game/Galileo";
import type { Poi } from "@/lib/pois";

// Le risposte sono dettagli che si leggono o si contano sul posto: si confrontano qui,
// senza IA, ignorando maiuscole, accenti, articoli e punteggiatura.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function isRight(given: string, answers: string[]): boolean {
  const words = normalize(given).split(" ");
  return answers.some((a) => words.includes(normalize(a)));
}

export function HuntChallenge({ poi, onSuccess }: { poi: Poi; onSuccess: () => void }) {
  const steps = poi.hunt ?? [];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
    setAnswer("");
    setSolved(false);
    setWrong(false);
    setHintOpen(false);
  }, [poi.id]);

  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;

  const check = () => {
    if (!answer.trim()) return;
    if (isRight(answer, step.answers)) {
      setSolved(true);
      setWrong(false);
      setHintOpen(false);
    } else {
      setWrong(true);
      setHintOpen(true);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setAnswer("");
    setSolved(false);
    setWrong(false);
    setHintOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < index || (i === index && solved) ? "bg-green-500" : i === index ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Dettaglio {index + 1}/{steps.length}
        </span>
        {!solved && (
          <span className="ml-auto">
            <HintButton onClick={() => setHintOpen(true)} hasMore={!hintOpen} />
          </span>
        )}
      </div>

      <p className="text-sm font-medium leading-relaxed">{step.clue}</p>

      {!solved ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <Input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setWrong(false);
            }}
            placeholder="Cosa hai trovato?"
            autoComplete="off"
            enterKeyHint="done"
          />
          <Button type="submit" disabled={!answer.trim()}>
            Controlla
          </Button>
        </form>
      ) : (
        <GalileoBubble title="Trovato!" text={step.found} />
      )}

      {wrong && <p className="text-sm italic text-muted-foreground">Non ancora: guarda meglio e riprova!</p>}

      {!solved && hintOpen && <GalileoBubble text={step.hint} onClose={() => setHintOpen(false)} />}

      {solved && (
        <Button className="w-full" onClick={last ? onSuccess : next}>
          {last ? "Completa la tappa ✅" : "Prossimo dettaglio →"}
        </Button>
      )}
    </div>
  );
}
