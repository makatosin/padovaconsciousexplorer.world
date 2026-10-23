import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MISSIONS, POIS, formatDistance, suggestMission, type Mission } from "@/lib/pois";
import { GalileoAvatar } from "./Galileo";

const MISSION_KEY = "pce-mission-v1";
const PICKED_KEY = "pce-mission-picked-v1";

export function readActiveMission(): string | null {
  try {
    return localStorage.getItem(MISSION_KEY);
  } catch {
    return null;
  }
}

// Missione scelta all'inizio (dopo la schermata "Perché queste tappe?"): resta salvata
// sul telefono e si può cambiare in qualsiasi momento dalla legenda della mappa.
export function useMissionPicker(aboutOpen: boolean) {
  const [open, setOpen] = useState(false);
  const [missionId, setMissionId] = useState<string | null>(null);

  useEffect(() => {
    setMissionId(readActiveMission());
  }, []);

  useEffect(() => {
    if (aboutOpen) return;
    try {
      if (localStorage.getItem(PICKED_KEY) !== "1") setOpen(true);
    } catch {}
  }, [aboutOpen]);

  const markSeen = () => {
    try {
      localStorage.setItem(PICKED_KEY, "1");
    } catch {}
  };

  const choose = useCallback((id: string) => {
    setMissionId(id);
    try {
      localStorage.setItem(MISSION_KEY, id);
    } catch {}
    markSeen();
    setOpen(false);
  }, []);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) markSeen();
  };

  return { open, onOpenChange, show: () => setOpen(true), missionId, choose };
}

export type PickerLocation =
  | { state: "ok"; lat: number; lng: number }
  | { state: "searching" }
  | { state: "denied" }
  | { state: "none" };

export function MissionPickerDialog({
  open,
  onOpenChange,
  onChoose,
  currentId,
  location,
  visited,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChoose: (m: Mission) => void;
  currentId: string | null;
  location: PickerLocation;
  visited: number[];
}) {
  // Nudge di prossimità: Galileo consiglia la missione con la tappa più vicina, ma tutte
  // restano selezionabili.
  const suggestion =
    location.state === "ok" ? suggestMission(location, visited) : null;
  const suggestedId = suggestion && !suggestion.far ? suggestion.mission.id : null;
  const note =
    location.state === "searching"
      ? "Sto cercando dove ti trovi per consigliarti la missione più vicina…"
      : location.state === "denied"
        ? "Senza la posizione non posso consigliarti una missione: scegli quella che ti ispira di più."
        : suggestion?.far
          ? `Sei a ${formatDistance(suggestion.distance)} dalla tappa più vicina: quando sarai a Padova ti consiglierò la missione più comoda.`
          : suggestion
            ? `${
                suggestion.distance <= suggestion.poi.geofence_radius_m
                  ? `Sei proprio a ${suggestion.poi.name}`
                  : `Sei a ${formatDistance(suggestion.distance)} da ${suggestion.poi.name}`
              }: ti consiglio di iniziare da ${suggestion.mission.title}!`
            : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1500] max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="mb-1 flex items-center gap-2">
            <GalileoAvatar className="size-11" />
            <DialogTitle>Da quale missione vuoi iniziare?</DialogTitle>
          </div>
          <DialogDescription>
            Ogni missione collega alcune tappe con un filo narrativo. Puoi
            cambiarla quando vuoi, e le tappe restano tutte aperte.
          </DialogDescription>
        </DialogHeader>
        {note && (
          <p
            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-950"
            role="status"
            aria-live="polite"
          >
            {note}
          </p>
        )}
        <ul className="space-y-2">
          {MISSIONS.map((m) => {
            const active = m.id === currentId;
            const suggested = m.id === suggestedId;
            return (
              <li key={m.id}>
                <button
                  onClick={() => onChoose(m)}
                  className={`relative flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-primary bg-primary/10"
                      : suggested
                        ? "border-amber-400 bg-amber-50/60"
                        : "border-border hover:border-primary/60"
                  }`}
                >
                  {suggested && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm">
                      ⭐ Consigliata, è la più vicina
                    </span>
                  )}
                  <img src={m.badgeArt} alt="" className="size-14 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">
                      {m.emoji} {m.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {m.description}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-accent">
                      {m.poiIds
                        .map((id) => POIS.find((p) => p.id === id)?.name)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          onClick={() => onOpenChange(false)}
          className="w-full rounded-md py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          Decido dopo
        </button>
      </DialogContent>
    </Dialog>
  );
}
