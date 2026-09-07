import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MapPin, Locate, Sparkles, Camera, Send, FlaskConical, MessageCircle, Zap, Award, RefreshCw, Footprints, Headphones, Play, Pause, Check, ArrowUp, ArrowDown } from "lucide-react";
import { POIS, BADGES, haversineMeters, type Poi } from "@/lib/pois";
import { useActiveProgress, useDemoMode, computeNewBadges } from "@/lib/demo-mode";
import { chatWithMentor, validateTrivia, validatePhoto } from "@/lib/game.functions";
import { MentorChatDialog } from "@/components/game/MentorChatDialog";
import portaPortelloAudio from "@/assets/porta-portello.wav.asset.json";

const MapView = lazy(() => import("@/components/game/MapView"));

function getDemoToken(): string | undefined {
  try {
    return sessionStorage.getItem("pce-demo-token") ?? undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/_authenticated/mappa")({
  head: () => ({ meta: [{ title: "Mappa · Padova Conscious Explorer" }] }),
  component: MapPage,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

function MapPage() {
  const { progress, completePoi } = useActiveProgress();
  const { demoActive, enterDemo, exitDemo, setDemoProgress, onBadgeUnlock } = useDemoMode();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activePoiId, setActivePoiId] = useState<number | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [walkerPos, setWalkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activePoi = useMemo(
    () => POIS.find((p) => p.id === activePoiId) ?? null,
    [activePoiId],
  );

  const distance =
    userPos && activePoi
      ? haversineMeters(userPos.lat, userPos.lng, activePoi.latitude, activePoi.longitude)
      : null;

  const inRange =
    distance != null && activePoi != null && distance <= activePoi.geofence_radius_m;

  const refreshLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalizzazione non disponibile.");
      return;
    }
    setTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRecenterKey((k) => k + 1);
        setTracking(false);
        toast.success("Posizione aggiornata");
      },
      (err) => {
        setTracking(false);
        toast.error(`Impossibile ottenere la posizione: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const teleportTo = (poi: Poi) => {
    setUserPos({ lat: poi.latitude, lng: poi.longitude });
    setActivePoiId(poi.id);
    setRecenterKey((k) => k + 1);
    toast.success(`Demo: teletrasporto a ${poi.name}`);
  };

  const stopWalk = () => {
    if (walkTimerRef.current) {
      clearInterval(walkTimerRef.current);
      walkTimerRef.current = null;
    }
    setWalkerPos(null);
  };

  useEffect(() => () => stopWalk(), []);

  const simulateWalkTo = (poi: Poi) => {
    stopWalk();
    const start = userPos ?? { lat: 45.4064, lng: 11.8768 };
    const target = { lat: poi.latitude, lng: poi.longitude };
    const steps = 30;
    let i = 0;
    setWalkerPos(start);
    setActivePoiId(poi.id);
    setRecenterKey((k) => k + 1);
    walkTimerRef.current = setInterval(() => {
      i += 1;
      const t = i / steps;
      const lat = start.lat + (target.lat - start.lat) * t;
      const lng = start.lng + (target.lng - start.lng) * t;
      setWalkerPos({ lat, lng });
      if (i >= steps) {
        stopWalk();
        setUserPos(target);
        setRecenterKey((k) => k + 1);
        toast.success(`Arrivato a ${poi.name}`);
      }
    }, 120);
  };

  const unlockAllBadges = () => {
    const all = BADGES.map((b) => b.id);
    setDemoProgress({ ...progress, badges_earned: all });
    all.forEach(onBadgeUnlock);
  };

  const resetDemo = () => {
    setDemoProgress({ total_xp: 0, visited_places: [], badges_earned: [] });
    setUserPos(null);
    setActivePoiId(null);
    stopWalk();
    toast.info("Demo azzerata");
  };

  const handleComplete = async (poi: Poi) => {
    const currentVisited = progress.visited_places;
    if (currentVisited.includes(poi.id)) return;
    const nextVisited = [...currentVisited, poi.id];
    const newBadges = computeNewBadges(progress.badges_earned, nextVisited);
    await completePoi(poi.id, 0, newBadges);
    toast.success(`${poi.name} sbloccato!`, {
      description: newBadges.length ? `Badge sbloccato: ${newBadges.join(", ")}` : undefined,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Toaster position="top-center" richColors />

      {demoActive && (
        <div className="absolute inset-x-0 top-0 z-[700] flex items-center justify-between gap-2 bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground shadow">
          <span className="flex items-center gap-1.5">
            <FlaskConical className="size-3.5" />
            Modalità Demo · progressi non salvati
          </span>
          <button
            onClick={exitDemo}
            className="rounded-full bg-background/20 px-2 py-0.5 text-[10px] font-semibold hover:bg-background/30"
          >
            Esci
          </button>
        </div>
      )}

      {/* Map full-bleed */}
      <div className="absolute inset-0">
        <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Caricamento mappa…</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Caricamento mappa…</div>}>
            <MapView
              userPos={userPos}
              onPoiClick={setActivePoiId}
              visited={progress.visited_places}
              recenterKey={recenterKey}
              walkerPos={walkerPos}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {/* Legend of remaining POIs (top-right) */}
      <aside className={`pointer-events-none absolute right-2 z-[500] w-[190px] ${demoActive ? "top-10" : "top-2"}`}>
        <Card className="pointer-events-auto border-border/60 bg-card/95 p-2 shadow-md backdrop-blur">
          <div className="mb-1.5 flex items-center gap-1.5 px-1">
            <MapPin className="size-3.5 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              LUOGHI
            </span>
          </div>
          <ul className="space-y-1">
            {POIS.map((poi) => {
              const visited = progress.visited_places.includes(poi.id);
              return (
                <li key={poi.id}>
                  <button
                    onClick={() => setActivePoiId(poi.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                      visited
                        ? "bg-primary/10 text-primary line-through opacity-70"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block size-2 rounded-full ${
                        visited ? "bg-primary" : "bg-accent"
                      }`}
                    />
                    <span className="truncate font-medium">{poi.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1.5 border-t border-border/60 pt-1.5 px-1 text-[9px] text-muted-foreground">
            🔒 Tracciamento off. Tocca 📍 per aggiornare.
          </div>
        </Card>
      </aside>

      {/* Locate FAB */}
      <button
        onClick={refreshLocation}
        aria-label="Verifica la mia posizione"
        className="absolute bottom-4 right-4 z-[500] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
      >
        <Locate className={`size-6 ${tracking ? "animate-spin" : ""}`} />
      </button>

      {/* Mentor FAB (above Locate) */}
      <button
        onClick={() => setMentorOpen(true)}
        aria-label="Chat con il Mentore Storico"
        className="absolute bottom-20 right-4 z-[500] flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition active:scale-95"
      >
        <MessageCircle className="size-5" />
      </button>

      {/* Sandbox / Demo entry (bottom-left) */}
      <div className="absolute bottom-4 left-4 z-[500]">
        {!demoActive ? (
          <button
            onClick={enterDemo}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/95 px-3 py-2 text-[11px] font-semibold shadow-md backdrop-blur hover:bg-accent hover:text-accent-foreground"
          >
            <FlaskConical className="size-3.5" />
            Avvia Demo
          </button>
        ) : (
          <Drawer open={sandboxOpen} onOpenChange={setSandboxOpen}>
            <DrawerTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-[11px] font-semibold text-accent-foreground shadow-md">
                <FlaskConical className="size-3.5" />
                Sandbox
              </button>
            </DrawerTrigger>
            <DrawerContent className="z-[1200]">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <FlaskConical className="size-4 text-accent" />
                  Sandbox Demo
                </DrawerTitle>
              </DrawerHeader>
              <SandboxPanel
                progress={progress}
                onTeleport={(p) => { teleportTo(p); setSandboxOpen(false); }}
                onWalk={(p) => { simulateWalkTo(p); setSandboxOpen(false); }}
                onUnlockBadges={unlockAllBadges}
                onReset={resetDemo}
              />
            </DrawerContent>
          </Drawer>
        )}
      </div>

      <MentorChatDialog open={mentorOpen} onOpenChange={setMentorOpen} />

      <PoiSheet
        poi={activePoi}
        open={!!activePoi}
        onOpenChange={(o) => !o && setActivePoiId(null)}
        inRange={inRange}
        distance={distance}
        alreadyDone={activePoi ? progress.visited_places.includes(activePoi.id) : false}
        onComplete={handleComplete}
      />
    </div>
  );
}

function SandboxPanel({
  progress,
  onTeleport,
  onWalk,
  onUnlockBadges,
  onReset,
}: {
  progress: { total_xp: number; visited_places: number[]; badges_earned: string[] };
  onTeleport: (poi: Poi) => void;
  onWalk: (poi: Poi) => void;
  onUnlockBadges: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5 px-4 pb-6">
      <section>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Simula spostamento
        </div>
        <div className="space-y-2">
          {POIS.map((poi) => {
            const done = progress.visited_places.includes(poi.id);
            return (
              <div
                key={poi.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-2"
              >
                <div className="flex-1 truncate text-sm font-medium">
                  {done ? "✅ " : ""}{poi.name}
                </div>
                <Button size="sm" variant="outline" onClick={() => onWalk(poi)}>
                  <Footprints className="mr-1 size-3.5" />
                  Cammina
                </Button>
                <Button size="sm" onClick={() => onTeleport(poi)}>
                  <Zap className="mr-1 size-3.5" />
                  Teletrasporto
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onUnlockBadges}>
          <Award className="mr-2 size-4" />
          Sblocca tutti i badge
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onReset}>
          <RefreshCw className="mr-2 size-4" />
          Reset
        </Button>
      </section>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        In modalità demo i progressi non vengono salvati sul tuo account. Le
        sfide AI (trivia e foto) e la chat con il Mentore sono reali.
      </p>
    </div>
  );
}

function PoiSheet({
  poi,
  open,
  onOpenChange,
  inRange,
  distance,
  alreadyDone,
  onComplete,
}: {
  poi: Poi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inRange: boolean;
  distance: number | null;
  alreadyDone: boolean;
  onComplete: (poi: Poi) => void;
}) {
  if (!poi) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[1000] h-[85vh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="border-b border-border/60 p-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5 text-accent" />
            {poi.name}
          </SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                inRange ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {inRange ? "🟢 Nel geofence" : "🔒 Fuori dal raggio"}
            </span>
            {distance != null && (
              <span>
                {distance < 1000
                  ? `${Math.round(distance)} m`
                  : `${(distance / 1000).toFixed(1)} km`}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {poi.bot_context}
          </p>

          {alreadyDone && (
            <Card className="border-primary/40 bg-primary/5 p-3 text-sm">
              ✅ Tappa già completata.{" "}
              {poi.recommended_activity && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {poi.recommended_activity}
                </span>
              )}
            </Card>
          )}

          {!alreadyDone && (
            <ChallengePanel poi={poi} inRange={inRange} onSuccess={() => onComplete(poi)} />
          )}

          {inRange && !alreadyDone && <MentorChat poi={poi} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChallengePanel({
  poi,
  inRange,
  onSuccess,
}: {
  poi: Poi;
  inRange: boolean;
  onSuccess: () => void;
}) {
  const triviaFn = useServerFn(validateTrivia);
  const photoFn = useServerFn(validatePhoto);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitTrivia = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await triviaFn({ data: { poiId: poi.id, answer, demoToken: getDemoToken() } });
      setFeedback(res.feedback);
      if (res.valid) onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const submitPhoto = async (file: File) => {
    setBusy(true);
    setFeedback(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await photoFn({ data: { poiId: poi.id, imageDataUrl: dataUrl, demoToken: getDemoToken() } });
      setFeedback(res.feedback);
      if (res.valid) onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-accent/40 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        {poi.challenge_type === "FOTO" ? (
          <Camera className="size-4" />
        ) : poi.challenge_type === "AUDIO" ? (
          <Headphones className="size-4" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Sfida
      </div>
      <p className="mb-3 text-sm leading-relaxed">{poi.challenge_text}</p>

      {!inRange && (
        <div className="rounded-lg border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
          🔒 Avvicinati al luogo per sbloccare la sfida (o usa il pulsante Demo).
        </div>
      )}

      {inRange && poi.challenge_type === "TRIVIA" && poi.ordering && (
        <OrderingChallenge
          poi={poi}
          onSuccess={onSuccess}
          onFeedback={setFeedback}
        />
      )}

      {inRange && poi.challenge_type === "TRIVIA" && !poi.ordering && poi.choices && (
        <div className="grid gap-2">
          {poi.choices.map((c) => {
            const selected = answer === c.key;
            return (
              <Button
                key={c.key}
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={busy}
                className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                onClick={async () => {
                  setAnswer(c.key);
                  setBusy(true);
                  setFeedback(null);
                  try {
                    const res = await triviaFn({ data: { poiId: poi.id, answer: c.key } });
                    setFeedback(res.feedback);
                    if (res.valid) onSuccess();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Errore");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <span className="mr-2 font-semibold">{c.key}.</span>
                <span>{c.label}</span>
              </Button>
            );
          })}
        </div>
      )}

      {inRange && poi.challenge_type === "TRIVIA" && !poi.ordering && !poi.choices && (
        <div className="space-y-2">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="La tua risposta…"
            rows={2}
            disabled={busy}
          />
          <Button onClick={submitTrivia} disabled={busy || !answer.trim()} className="w-full">
            {busy ? "Verifica…" : "Invia risposta"}
          </Button>
        </div>
      )}

      {inRange && poi.challenge_type === "FOTO" && (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) submitPhoto(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full">
            <Camera className="mr-2 size-4" />
            {busy ? "Analisi AI…" : "Scatta o carica foto"}
          </Button>
        </div>
      )}

      {inRange && poi.challenge_type === "AUDIO" && (
        <AudioChallenge poi={poi} onComplete={onSuccess} />
      )}

      {feedback && <p className="mt-3 text-sm italic text-muted-foreground">🤖 {feedback}</p>}
    </Card>
  );
}

function OrderingChallenge({
  poi,
  onSuccess,
  onFeedback,
}: {
  poi: Poi;
  onSuccess: () => void;
  onFeedback: (msg: string | null) => void;
}) {
  const ordering = poi.ordering!;
  const [order, setOrder] = useState(() => ordering.items.map((i) => i.key));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    onFeedback(null);
  };

  const verify = () => {
    const expected = poi.expected_answer_or_validation
      .split(",")
      .map((s) => s.trim().toUpperCase());
    const ok = order.every((k, i) => k === expected[i]);
    if (ok) {
      onFeedback("Sequenza corretta! Ottimo lavoro.");
      onSuccess();
    } else {
      onFeedback("Sequenza non corretta. Prova a riordinare gli eventi.");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{ordering.prompt}</p>
      <ul className="space-y-2">
        {order.map((key, idx) => {
          const item = ordering.items.find((i) => i.key === key)!;
          return (
            <li
              key={key}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-background p-2"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm leading-snug">{item.label}</span>
              <div className="flex flex-col gap-1">
                <button
                  aria-label="Sposta su"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="grid size-6 place-items-center rounded-md border border-border/60 hover:bg-muted disabled:opacity-40"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  aria-label="Sposta giù"
                  onClick={() => move(idx, 1)}
                  disabled={idx === order.length - 1}
                  className="grid size-6 place-items-center rounded-md border border-border/60 hover:bg-muted disabled:opacity-40"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <Button onClick={verify} className="w-full">
        <Check className="mr-2 size-4" />
        Verifica sequenza
      </Button>
    </div>
  );
}

function AudioChallenge({ poi, onComplete }: { poi: Poi; onComplete: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(portaPortelloAudio.url);
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setFinished(true);
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("play", () => setPlaying(true));
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => setPlaying(false));
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={toggle} variant="secondary" className="w-full">
        {playing ? (
          <>
            <Pause className="mr-2 size-4" /> Pausa
          </>
        ) : (
          <>
            <Play className="mr-2 size-4" /> {finished ? "Riascolta" : "Ascolta la traccia"}
          </>
        )}
      </Button>
      <Button
        onClick={() => {
          audioRef.current?.pause();
          onComplete();
        }}
        disabled={!finished}
        className="w-full"
      >
        <Check className="mr-2 size-4" />
        Ho completato l'ascolto
      </Button>
    </div>
  );
}

function MentorChat({ poi }: { poi: Poi }) {
  const chatFn = useServerFn(chatWithMentor);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Benvenuto a ${poi.name}! Sono il tuo Mentore Storico. Chiedimi qualsiasi curiosità su questo luogo. ✨`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await chatFn({
        data: { poiId: poi.id, history: messages, userMessage: text, demoToken: getDemoToken() },
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Mentore Storico
      </div>
      <div className="mb-3 max-h-56 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-6 bg-primary text-primary-foreground"
                : "mr-6 bg-muted text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="mr-6 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            …
          </div>
        )}
      </div>
      <div className="flex gap-2">
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
        />
        <Button size="icon" onClick={send} disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}