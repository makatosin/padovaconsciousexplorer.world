import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SEEN_KEY = "pce-home-consiglio";

type Platform = "ios" | "android" | "other";

// Su Android Chrome può offrire la sua finestra "Installa app": la teniamo da parte
// (niente banner automatico) e la apriamo solo se l'utente tocca "Come si fa".
type InstallPromptEvent = Event & { prompt: () => Promise<void> };
let deferredPrompt: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
}

function detect(): { platform: Platform; standalone: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const platform: Platform = ios ? "ios" : /Android/i.test(ua) ? "android" : "other";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { platform, standalone };
}

function Steps({ platform }: { platform: Platform }) {
  if (platform === "ios") {
    return (
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
        <li>
          Tocca <b>Condividi</b> (il quadrato con la freccia in su) nella barra del browser.
        </li>
        <li>
          Scorri e scegli <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.
        </li>
        <li>
          Apri l'app dalla nuova icona: la prima volta ti chiede di accedere e di consentire la
          posizione, poi ritrovi tutti i tuoi progressi.
        </li>
      </ol>
    );
  }
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
      <li>
        Tocca il menu <b>⋮</b> in alto a destra nel browser.
      </li>
      <li>
        Scegli <b>Aggiungi a schermata Home</b> (o <b>Installa app</b>) e conferma.
      </li>
      <li>Da ora la apri dalla nuova icona, con i tuoi progressi già lì.</li>
    </ol>
  );
}

// Invito ad aggiungere l'app alla schermata Home. Compare solo sul telefono e solo se
// l'app non è già aperta dall'icona. Nella scheda di una tappa ("tip") si vede una
// volta sola; nel profilo ("profile") resta disponibile per chi la vuole dopo.
export function HomeScreenTip({
  variant,
  className = "",
}: {
  variant: "tip" | "profile";
  className?: string;
}) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);

  useEffect(() => {
    const { platform, standalone } = detect();
    if (platform === "other" || standalone) return;
    setPlatform(platform);
    if (variant === "profile") {
      setVisible(true);
      return;
    }
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setVisible(true);
  }, [variant]);

  if (!visible || !platform) return null;

  const howTo = async () => {
    if (deferredPrompt) {
      const p = deferredPrompt;
      deferredPrompt = null;
      try {
        await p.prompt();
        return;
      } catch {}
    }
    setStepsOpen(true);
  };

  return (
    <Card className={`border-accent/30 bg-accent/5 p-3 text-sm ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none" aria-hidden>
          📲
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {variant === "tip" ? "Un consiglio per la passeggiata" : "Aggiungi l'app alla schermata Home"}
          </div>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Con l'icona sulla Home riapri la mappa con un tocco tra una tappa e l'altra, a tutto
            schermo e senza dover cercare il link. Non scarichi nulla dagli store e i progressi
            restano salvati.
          </p>
          {stepsOpen ? (
            <Steps platform={platform} />
          ) : (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={howTo}>
                Come si fa
              </Button>
              {variant === "tip" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-muted-foreground"
                  onClick={() => setVisible(false)}
                >
                  No grazie
                </Button>
              )}
            </div>
          )}
          {variant === "tip" && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Te lo dico solo questa volta: lo ritrovi comunque nel profilo.
            </p>
          )}
        </div>
        {variant === "tip" && (
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setVisible(false)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
