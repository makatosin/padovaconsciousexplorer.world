import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Platform = "ios" | "android" | "other";

function detect(): { platform: Platform; standalone: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const platform: Platform = ios ? "ios" : /Android/i.test(ua) ? "android" : "other";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { platform, standalone };
}

function Steps({ platform, standalone }: { platform: Platform; standalone: boolean }) {
  if (platform === "ios") {
    return (
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
        {standalone ? (
          <li>
            Apri <b>Impostazioni</b> del telefono → <b>Privacy e sicurezza</b> → <b>Localizzazione</b>
            : deve essere attiva, e per <b>Siti web di Safari</b> scegli <b>Mentre usi l'app</b>.
          </li>
        ) : (
          <>
            <li>
              Tocca <b>aA</b> (o l'icona a sinistra dell'indirizzo) nella barra del browser.
            </li>
            <li>
              Scegli <b>Impostazioni sito web</b> → <b>Posizione</b> → <b>Consenti</b>.
            </li>
          </>
        )}
        <li>
          Torna qui e tocca <b>Riprova</b>.
        </li>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
        {standalone ? (
          <li>
            Apri il sito da <b>Chrome</b>: le autorizzazioni si cambiano lì e valgono anche per l'icona
            sulla Home.
          </li>
        ) : null}
        <li>
          Tocca l'icona a sinistra dell'indirizzo (il lucchetto o le regolazioni).
        </li>
        <li>
          Scegli <b>Autorizzazioni</b> → <b>Posizione</b> → <b>Consenti</b>.
        </li>
        <li>
          Torna qui e tocca <b>Riprova</b>.
        </li>
      </ol>
    );
  }
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
      <li>Clicca l'icona a sinistra dell'indirizzo nella barra del browser.</li>
      <li>
        Imposta <b>Posizione</b> su <b>Consenti</b>.
      </li>
      <li>
        Torna qui e clicca <b>Riprova</b>.
      </li>
    </ol>
  );
}

// Se il permesso di posizione è stato negato, il browser di solito non lo richiede più da
// solo: questo riquadro spiega come riattivarlo, passo per passo, sul telefono in uso.
export function LocationBlockedTip({ className = "" }: { className?: string }) {
  const [env, setEnv] = useState<{ platform: Platform; standalone: boolean } | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    setEnv(detect());
  }, []);

  if (!env || closed) return null;

  return (
    <Card className={`border-destructive/30 bg-card/95 p-3 text-sm shadow-lg backdrop-blur ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none" aria-hidden>
          📍
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">La posizione è bloccata</div>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Senza posizione l'app non può riconoscere il tuo arrivo nelle tappe. Si riattiva in pochi
            secondi.
          </p>
          {stepsOpen && <Steps platform={env.platform} standalone={env.standalone} />}
          <div className="mt-2 flex gap-2">
            {!stepsOpen && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setStepsOpen(true)}>
                Come si fa
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={() => window.location.reload()}>
              Riprova
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Chiudi"
          onClick={() => setClosed(true)}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </Card>
  );
}
