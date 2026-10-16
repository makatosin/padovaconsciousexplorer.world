import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MISSIONS, POIS, type Mission } from "@/lib/pois";
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

export function MissionPickerDialog({
  open,
  onOpenChange,
  onChoose,
  currentId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChoose: (m: Mission) => void;
  currentId: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1500] max-h-[85vh] max-w-md overflow-y-auto">
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
        <ul className="space-y-2">
          {MISSIONS.map((m) => {
            const active = m.id === currentId;
            return (
              <li key={m.id}>
                <button
                  onClick={() => onChoose(m)}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60"
                  }`}
                >
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
