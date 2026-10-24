import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MapPin, Locate, Sparkles, Camera, Headphones, Play, Pause, Check, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { POIS, BADGES, MISSIONS, atPoi, distanceToArea, formatDistance, haversineMeters, missionsForPoi, type Poi } from "@/lib/pois";
import { useActiveProgress, computeNewBadges } from "@/lib/game-progress";
import { validateTrivia } from "@/lib/game.functions";
import { POI_SUGGESTIONS, answerAboutPoi } from "@/lib/galileo-brain";
import { GalileoChat } from "@/components/game/GalileoChat";
import { MentorChatDialog } from "@/components/game/MentorChatDialog";
import { AboutDialog, useAboutDialog } from "@/components/game/AboutDialog";
import { GalileoAvatar, GalileoBubble, HintButton, useGalileoHints } from "@/components/game/Galileo";
import { MissionPickerDialog, useMissionPicker } from "@/components/game/MissionPickerDialog";
import { HuntChallenge } from "@/components/game/HuntChallenge";
import { LegendFold } from "@/components/game/LegendFold";
import { HomeScreenTip } from "@/components/game/HomeScreenTip";
import { LocationBlockedTip } from "@/components/game/LocationBlockedTip";
import { nextPoiAfter } from "@/lib/pois";
import { setStartingMission } from "@/lib/progress.functions";
import portaPortelloAudio from "@/assets/porta-portello.wav.asset.json";

const MapView = lazy(() => import("@/components/game/MapView"));

const MAX_GPS_TOLERANCE_M = 50;

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Permesso di posizione negato: abilitalo nelle impostazioni del browser per sbloccare le tappe.";
    case err.POSITION_UNAVAILABLE:
      return "Posizione non disponibile: controlla che il GPS sia attivo e riprova.";
    case err.TIMEOUT:
      return "Il GPS non ha risposto in tempo: riprova all'aperto, lontano da portici ed edifici alti.";
    default:
      return `Impossibile ottenere la posizione: ${err.message}`;
  }
}


export const Route = createFileRoute("/_authenticated/mappa")({
  head: () => ({ meta: [{ title: "Mappa · Padova Conscious Explorer" }] }),
  component: MapPage,
});


function MapPage() {
  const { progress, completePoi } = useActiveProgress();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>(
    null,
  );
  const [activePoiId, setActivePoiId] = useState<number | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const about = useAboutDialog();
  const missionPicker = useMissionPicker(about.open);
  const setMissionFn = useServerFn(setStartingMission);
  const activeMission = MISSIONS.find((m) => m.id === missionPicker.missionId) ?? null;
  const firstFixRef = useRef(true);
  const notifiedRef = useRef<Set<number>>(new Set());

  const activePoi = useMemo(
    () => POIS.find((p) => p.id === activePoiId) ?? null,
    [activePoiId],
  );

  // Metri che mancano per entrare nell'area della tappa (0 se si è già dentro).
  const distance =
    userPos && activePoi ? distanceToArea(activePoi, userPos.lat, userPos.lng) : null;

  // Il GPS dello smartphone in centro storico sbaglia spesso di 20-50 m: si concede
  // all'utente il margine dichiarato dal dispositivo, fino a un massimo di 50 m.
  const tolerance = Math.min(userPos?.accuracy ?? 0, MAX_GPS_TOLERANCE_M);
  const inRange =
    distance != null &&
    activePoi != null &&
    distance - tolerance <= 0;

  // Posizione sempre attiva mentre la mappa è aperta. La posizione resta sul telefono e
  // non viene salvata.
  // Al primo accesso parte solo dopo la schermata "Perché queste tappe?", così il
  // permesso viene chiesto dopo averne spiegato il motivo.
  const locationAllowed = about.checked && !about.open;
  const [locationStarted, setLocationStarted] = useState(false);
  useEffect(() => {
    if (locationAllowed) setLocationStarted(true);
  }, [locationAllowed]);

  useEffect(() => {
    if (!locationStarted || typeof navigator === "undefined" || !navigator.geolocation)
      return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsDenied(false);
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        // Anche da fermo il GPS "balla" di qualche metro a ogni lettura: il segnaposto si
        // sposta solo se lo spostamento supera questo rumore (metà della precisione
        // dichiarata, tra 6 e 20 m), altrimenti tremerebbe di continuo.
        setUserPos((prev) => {
          if (!prev) return next;
          const moved = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
          const noise = Math.min(Math.max(next.accuracy / 2, 6), 20);
          if (moved >= noise) return next;
          return Math.abs((prev.accuracy ?? next.accuracy) - next.accuracy) > 5
            ? { ...prev, accuracy: next.accuracy }
            : prev;
        });
        if (firstFixRef.current) {
          firstFixRef.current = false;
          setRecenterKey((k) => k + 1);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [locationStarted]);

  // Tocco su "Consenti la posizione e iniziamo": il permesso viene chiesto subito e una
  // prima posizione, anche approssimativa, basta per consigliare la missione più vicina.
  const requestLocationNow = () => {
    setLocationStarted(true);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsDenied(false);
        setUserPos(
          (prev) =>
            prev ?? {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
            },
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsDenied(true);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  // Avviso quando si entra nel raggio di una tappa non ancora completata (una volta per
  // tappa a ogni apertura dell'app): messaggio nell'app, vibrazione e, se l'app è in
  // secondo piano e il permesso è stato dato, una notifica del telefono.
  useEffect(() => {
    if (!userPos) return;
    const tol = Math.min(userPos.accuracy ?? 0, MAX_GPS_TOLERANCE_M);
    for (const poi of POIS) {
      if (progress.visited_places.includes(poi.id) || notifiedRef.current.has(poi.id)) continue;
      if (distanceToArea(poi, userPos.lat, userPos.lng) - tol > 0) continue;
      notifiedRef.current.add(poi.id);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      toast.success(`Eccoti ${atPoi(poi)}!`, {
        description: "La sfida è sbloccata.",
        duration: 8000,
        action: { label: "Apri", onClick: () => setActivePoiId(poi.id) },
      });
      try {
        if (
          document.visibilityState === "hidden" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification(`Eccoti ${atPoi(poi)}!`, {
            body: "Apri Padova Conscious Explorer: la sfida è sbloccata.",
            icon: "/icon-192.png",
            tag: `poi-${poi.id}`,
          });
        }
      } catch {}
      break;
    }
  }, [userPos, progress.visited_places]);

  const chooseMission = (missionId: string) => {
    missionPicker.choose(missionId);
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    const next = POIS.find((p) => m.poiIds.includes(p.id) && !progress.visited_places.includes(p.id));
    toast.success(`Missione ${m.title}`, {
      description: next ? `Prossima tappa: ${next.name}.` : "Hai già completato tutte le sue tappe!",
    });
    setMissionFn({ data: { missionId: m.id as "acqua" | "mura" | "verde" } }).catch(() => {});
  };

  const refreshLocation = () => {
    if (userPos) {
      setRecenterKey((k) => k + 1);
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Geolocalizzazione non disponibile.");
      return;
    }
    setTracking(true);
    const onSuccess = (pos: GeolocationPosition) => {
      const accuracy = Math.round(pos.coords.accuracy);
      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy });
      setRecenterKey((k) => k + 1);
      setTracking(false);
      toast.success("Posizione aggiornata", {
        description:
          accuracy > MAX_GPS_TOLERANCE_M
            ? `Segnale debole (precisione ±${accuracy} m): se puoi, spostati in uno spazio aperto e riprova.`
            : `Precisione ±${accuracy} m`,
      });
    };
    const onError = (err: GeolocationPositionError) => {
      setTracking(false);
      toast.error(geolocationErrorMessage(err));
    };
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        // In città il fix ad alta precisione può richiedere molto tempo:
        // in caso di timeout si riprova con la posizione di rete.
        if (err.code === err.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(onSuccess, onError, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 10000,
          });
          return;
        }
        onError(err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };


  const handleComplete = async (poi: Poi) => {
    const currentVisited = progress.visited_places;
    if (currentVisited.includes(poi.id)) return;
    const nextVisited = [...currentVisited, poi.id];
    const newBadges = computeNewBadges(progress.badges_earned, nextVisited);
    try {
      await completePoi(poi.id, poi.reward_xp, newBadges);
    } catch (e) {
      toast.error("Sfida superata, ma non sono riuscito a salvare il progresso.", {
        description: e instanceof Error ? e.message : "Controlla la connessione e riprova.",
      });
      return;
    }
    toast.success(`Tappa completata: ${poi.name}! ✅`, {
      description: newBadges.length
        ? `Badge sbloccato: ${newBadges.map((id) => BADGES.find((b) => b.id === id)?.title ?? id).join(", ")}`
        : undefined,
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Toaster position="top-center" richColors />


      {/* Map full-bleed */}
      <div className="absolute inset-0">
        <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Caricamento mappa…</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Caricamento mappa…</div>}>
            <MapView
              userPos={userPos}
              onPoiClick={setActivePoiId}
              visited={progress.visited_places}
              recenterKey={recenterKey}
              highlight={activeMission?.poiIds ?? []}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {/* Legenda: missione attiva e luoghi (in alto a destra) */}
      <aside className="pointer-events-none absolute right-2 top-2 z-[500] w-[200px]">
        <Card className="pointer-events-auto border-border/60 bg-card/95 p-2 shadow-md backdrop-blur">
          <button
            onClick={missionPicker.show}
            className="mb-1.5 flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left hover:bg-muted"
          >
            {activeMission ? (
              <>
                <img src={activeMission.badgeArt} alt="" className="size-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Missione
                  </span>
                  <span className="block truncate text-[11px] font-semibold">{activeMission.title}</span>
                </span>
              </>
            ) : (
              <>
                <MapPin className="size-3.5 text-accent" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Scegli una missione
                </span>
              </>
            )}
          </button>
          <LegendFold done={progress.visited_places.length} total={POIS.length}>
          <ul className="space-y-1">
            {[...POIS]
              .sort((a, b) => {
                const ia = activeMission?.poiIds.includes(a.id) ? 0 : 1;
                const ib = activeMission?.poiIds.includes(b.id) ? 0 : 1;
                return ia - ib;
              })
              .map((poi) => {
                const visited = progress.visited_places.includes(poi.id);
                const inMission = activeMission?.poiIds.includes(poi.id) ?? false;
                return (
                  <li key={poi.id}>
                    <button
                      onClick={() => setActivePoiId(poi.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                        visited
                          ? "bg-green-100 font-semibold text-green-800"
                          : inMission
                            ? "bg-accent/10 hover:bg-accent/20"
                            : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block size-2 rounded-full ${
                          visited ? "bg-green-600" : "bg-accent"
                        }`}
                      />
                      <span className="truncate font-medium">{poi.name}</span>
                      {visited && <Check className="ml-auto size-3 shrink-0 text-green-700" />}
                    </button>
                  </li>
                );
              })}
          </ul>
          <div className="mt-1.5 border-t border-border/60 px-1 pt-1.5 text-[9px] text-muted-foreground">
            {gpsDenied
              ? "📍 Posizione bloccata: attivala nelle impostazioni del browser."
              : "📍 Posizione attiva solo a mappa aperta. Non viene salvata."}
          </div>
          <button
            onClick={about.show}
            className="mt-1 w-full rounded-md px-1 py-1 text-left text-[10px] font-medium text-accent hover:bg-muted"
          >
            ℹ️ Perché queste tappe?
          </button>
          </LegendFold>
        </Card>
      </aside>

      {gpsDenied && <LocationBlockedTip className="absolute bottom-4 left-3 right-20 z-[550]" />}

      {/* Locate FAB */}
      <button
        onClick={refreshLocation}
        aria-label="Centra la mappa sulla mia posizione"
        className="absolute bottom-4 right-4 z-[500] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
      >
        <Locate className={`size-6 ${tracking ? "animate-spin" : ""}`} />
      </button>

      {/* Galileo: apre la chat (sopra il pulsante della posizione) */}
      <button
        onClick={() => setMentorOpen(true)}
        aria-label="Parla con Galileo"
        className="absolute bottom-20 right-3 z-[500] flex flex-col items-center gap-0.5 transition active:scale-95"
      >
        <GalileoAvatar className="size-16 rounded-full border-2 border-white shadow-lg" />
        <span className="rounded-full bg-card/95 px-1.5 py-0.5 text-[10px] font-semibold shadow">
          Galileo
        </span>
      </button>


      <MentorChatDialog open={mentorOpen} onOpenChange={setMentorOpen} />
      <AboutDialog open={about.open} onOpenChange={about.onOpenChange} onStart={requestLocationNow} />
      <MissionPickerDialog
        open={missionPicker.open && !about.open}
        onOpenChange={missionPicker.onOpenChange}
        currentId={missionPicker.missionId}
        onChoose={(m) => chooseMission(m.id)}
        visited={progress.visited_places}
        location={
          userPos
            ? { state: "ok", lat: userPos.lat, lng: userPos.lng }
            : gpsDenied
              ? { state: "denied" }
              : { state: "searching" }
        }
      />

      <PoiSheet
        poi={activePoi}
        open={!!activePoi}
        onOpenChange={(o) => !o && setActivePoiId(null)}
        inRange={inRange}
        distance={distance}
        alreadyDone={activePoi ? progress.visited_places.includes(activePoi.id) : false}
        onComplete={handleComplete}
        visited={progress.visited_places}
        onOpenPoi={setActivePoiId}
      />
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
  visited,
  onOpenPoi,
}: {
  poi: Poi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inRange: boolean;
  distance: number | null;
  alreadyDone: boolean;
  onComplete: (poi: Poi) => void;
  visited: number[];
  onOpenPoi: (id: number) => void;
}) {
  if (!poi) return null;
  const next = alreadyDone ? nextPoiAfter(poi, visited) : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[1000] h-[85dvh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="border-b border-border/60 p-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5 text-accent" />
            {poi.name}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                inRange ? "bg-green-100 font-semibold text-green-800" : "bg-muted text-muted-foreground"
              }`}
            >
              {inRange
                ? "📍 Sei qui"
                : `🔒 Avvicinati${distance != null ? ` (${formatDistance(distance)})` : ""}`}
            </span>
            {!alreadyDone && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(`sfida-${poi.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground shadow-sm active:scale-95"
              >
                Vai alla sfida <ChevronDown className="size-3.5" />
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-1.5">
            {missionsForPoi(poi.id).map((m) => (
              <span
                key={m.id}
                className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
              >
                {m.emoji} Missione {m.title}
              </span>
            ))}
          </div>
          <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
            {poi.bot_context
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => (
                <p key={i}>{line}</p>
              ))}
          </div>

          {alreadyDone && (
            <Card className="border-green-300 bg-green-50 p-3 text-sm font-medium text-green-800">
              ✅ Tappa completata!
            </Card>
          )}

          {alreadyDone && poi.galileo_tip && (
            <GalileoBubble
              title="Galileo ti consiglia"
              text={poi.galileo_tip.text}
              links={poi.galileo_tip.links}
            />
          )}

          {next && (
            <div className="space-y-2">
              <GalileoBubble
                title="Prossima tappa"
                text={`${next.mission ? `La prossima tappa della missione ${next.mission.title} è ${next.poi.name}` : `La tappa più vicina che ti manca è ${next.poi.name}`}, a ${formatDistance(next.distance)} da qui. Ti va di proseguire? 🧭`}
              />
              <Button variant="outline" className="w-full" onClick={() => onOpenPoi(next.poi.id)}>
                Apri la tappa {next.poi.name}
              </Button>
            </div>
          )}

          {alreadyDone && <HomeScreenTip variant="tip" />}

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
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const hints = useGalileoHints(poi, inRange);

  const submitTrivia = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await triviaFn({ data: { poiId: poi.id, answer } });
      setFeedback(res.feedback);
      if (res.valid) onSuccess();
      else hints.onWrongAnswer();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  // La foto resta sul telefono: non viene inviata né valutata da un'IA. Basta essere
  // nel raggio della tappa (la sfida si sblocca solo lì) e scattarla.
  const submitPhoto = (file: File) => {
    setPhotoUrl(URL.createObjectURL(file));
    setFeedback("Che bello scatto! 📸 La foto resta sul tuo telefono come ricordo della tappa.");
    onSuccess();
  };

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  return (
    <Card id={`sfida-${poi.id}`} className="scroll-mt-4 border-accent/40 bg-accent/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        {poi.challenge_type === "FOTO" ? (
          <Camera className="size-4" />
        ) : poi.challenge_type === "AUDIO" ? (
          <Headphones className="size-4" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Sfida
        {inRange && !poi.hunt && (
          <span className="ml-auto normal-case tracking-normal">
            <HintButton onClick={hints.askHint} hasMore={hints.hasMore} />
          </span>
        )}
      </div>
      <p className="mb-3 text-sm leading-relaxed">{poi.challenge_text}</p>

      {!inRange && (
        <div className="rounded-lg border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
          🔒 Avvicinati al luogo per sbloccare la sfida.
        </div>
      )}

      {inRange && poi.challenge_type === "TRIVIA" && poi.ordering && (
        <OrderingChallenge
          poi={poi}
          onSuccess={onSuccess}
          onFeedback={setFeedback}
          onWrong={hints.onWrongAnswer}
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
                    const res = await triviaFn({
                      data: { poiId: poi.id, answer: c.key },
                    });
                    setFeedback(res.feedback);
                    if (res.valid) onSuccess();
                    else hints.onWrongAnswer();
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
            Scatta la foto
          </Button>
          {photoUrl && (
            <img src={photoUrl} alt="La tua foto della tappa" className="max-h-56 w-full rounded-lg object-cover" />
          )}
        </div>
      )}

      {inRange && poi.challenge_type === "AUDIO" && (
        <AudioChallenge poi={poi} onComplete={onSuccess} />
      )}

      {inRange && poi.challenge_type === "CACCIA" && <HuntChallenge poi={poi} onSuccess={onSuccess} />}

      {feedback && <p className="mt-3 text-sm italic text-muted-foreground">{feedback}</p>}

      {inRange && hints.text && (
        <div className="mt-3">
          <GalileoBubble text={hints.text} onClose={hints.hide} />
        </div>
      )}
    </Card>
  );
}

function OrderingChallenge({
  poi,
  onSuccess,
  onFeedback,
  onWrong,
}: {
  poi: Poi;
  onSuccess: () => void;
  onFeedback: (msg: string | null) => void;
  onWrong: () => void;
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
      onWrong();
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
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(portaPortelloAudio.url);
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setFinished(true);
    });
    audio.addEventListener("pause", () => setPlaying(false));
    // Se la traccia non si carica (rete assente o file non raggiungibile),
    // la tappa non deve restare bloccata: si sblocca la conferma.
    audio.addEventListener("error", () => {
      setPlaying(false);
      setLoadError(true);
    });
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
      {loadError && (
        <p className="text-xs text-muted-foreground">
          Non riesco a caricare la traccia audio. Leggi il testo qui sotto e conferma quando hai
          finito.
        </p>
      )}
      {loadError && poi.audio_narration && (
        <p className="rounded-lg bg-background/60 p-3 text-sm italic leading-relaxed">
          {poi.audio_narration}
        </p>
      )}
      <Button
        onClick={() => {
          audioRef.current?.pause();
          onComplete();
        }}
        disabled={!finished && !loadError}
        className="w-full"
      >
        <Check className="mr-2 size-4" />
        Ho completato l'ascolto
      </Button>
    </div>
  );
}

function MentorChat({ poi }: { poi: Poi }) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <GalileoAvatar className="size-6" />
        Chiedi a Galileo
      </div>
      <GalileoChat
        className="max-h-80"
        intro={`Eccoti ${atPoi(poi)}! Sono Galileo: tocca una domanda qui sotto o scrivimi una curiosità su questo luogo. 🔭`}
        suggestions={POI_SUGGESTIONS}
        answer={(q) => answerAboutPoi(poi, q)}
      />
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