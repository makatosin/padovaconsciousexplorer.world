import { useCallback, useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import type { Poi } from "@/lib/pois";
import { GalileoAvatar } from "./GalileoAvatar";

export const GALILEO_NAME = "Galileo";

export { GalileoAvatar } from "./GalileoAvatar";

// Per qualche secondo dopo un nuovo messaggio Galileo muove la bocca.
export function useTalking(trigger: unknown, ms = 2600) {
  const [talking, setTalking] = useState(false);
  useEffect(() => {
    if (trigger == null || trigger === false) return;
    setTalking(true);
    const t = setTimeout(() => setTalking(false), ms);
    return () => clearTimeout(t);
  }, [trigger, ms]);
  return talking;
}

// Vignetta: Galileo compare accanto alla sfida e dà un consiglio.
export function GalileoBubble({
  text,
  onClose,
  links = [],
  title = `${GALILEO_NAME} ti suggerisce`,
}: {
  text: string;
  onClose?: () => void;
  links?: { label: string; url: string }[];
  title?: string;
}) {
  const talking = useTalking(text);
  return (
    <div
      className="gal-pop flex items-end gap-2"
      role="status"
      aria-live="polite"
    >
      <GalileoAvatar
        className="size-20 drop-shadow-md"
        framed={false}
        talking={talking}
        excited={talking}
      />
      <div className="relative flex-1 rounded-2xl rounded-bl-sm border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-950 shadow-sm">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
          {title}
        </div>
        {text}
        {links.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200"
              >
                🔗 {l.label} ↗
              </a>
            ))}
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Chiudi il suggerimento"
            className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-amber-700 hover:bg-amber-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Dopo quanti secondi di sfida aperta Galileo interviene da solo.
const AUTO_HINT_AFTER_MS = 60_000;

// Gestisce gli aiutini progressivi di una tappa: pulsante lampadina, risposta sbagliata
// e intervento automatico se la sfida resta aperta a lungo senza essere risolta.
export function useGalileoHints(poi: Poi, active: boolean) {
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setShown(0);
    setVisible(false);
  }, [poi.id]);

  const next = useCallback(() => {
    setShown((n) => Math.min(n + 1, poi.hints.length));
    setVisible(true);
  }, [poi.hints.length]);

  useEffect(() => {
    if (!active || shown > 0 || poi.hints.length === 0) return;
    const t = setTimeout(next, AUTO_HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [active, shown, next, poi.hints.length]);

  const text = shown > 0 ? poi.hints[shown - 1] : null;
  const hasMore = shown < poi.hints.length;
  return {
    text: visible ? text : null,
    hasMore,
    askHint: next,
    onWrongAnswer: next,
    hide: () => setVisible(false),
  };
}

export function HintButton({
  onClick,
  hasMore,
}: {
  onClick: () => void;
  hasMore: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasMore}
      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
    >
      <Lightbulb className="size-3.5" />
      {hasMore ? "Aiutino" : "Nessun altro aiutino"}
    </button>
  );
}
