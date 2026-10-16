import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BADGES } from "./pois";
import { useProgress, type Progress } from "./use-progress";
import { clearDemoToken } from "./demo-token";

type DemoProgress = Progress;

const emptyDemo: DemoProgress = {
  total_xp: 0,
  visited_places: [],
  badges_earned: [],
};

type DemoCtx = {
  demoActive: boolean;
  demoProgress: DemoProgress;
  enterDemo: () => void;
  exitDemo: () => void;
  setDemoProgress: (p: DemoProgress) => void;
  onBadgeUnlock: (badgeId: string) => void;
  registerBadgeListener: (fn: (badgeId: string) => void) => () => void;
};

const g = globalThis as unknown as { __pceDemoCtx?: React.Context<DemoCtx | null> };
const Ctx = g.__pceDemoCtx ?? (g.__pceDemoCtx = createContext<DemoCtx | null>(null));

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoActive, setDemoActive] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("pce-demo") === "1";
    } catch {
      return false;
    }
  });
  const [demoProgress, setDemoProgress] = useState<DemoProgress>(emptyDemo);
  const [listener, setListener] = useState<((id: string) => void) | null>(null);

  const enterDemo = useCallback(() => {
    setDemoProgress(emptyDemo);
    setDemoActive(true);
    toast.success("Modalità demo attiva", {
      description: "I progressi non verranno salvati.",
    });
  }, []);

  const exitDemo = useCallback(() => {
    setDemoActive(false);
    setDemoProgress(emptyDemo);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("pce-demo");
      } catch {}
      clearDemoToken();
    }
    toast.info("Uscito dalla modalità demo");
  }, []);

  // Auto-enter demo when arriving with the sessionStorage flag set
  // (e.g. from the "Prova la demo" button on /auth).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("pce-demo") === "1" && !demoActive) {
        setDemoProgress(emptyDemo);
        setDemoActive(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerBadgeListener = useCallback((fn: (id: string) => void) => {
    setListener(() => fn);
    return () => setListener(null);
  }, []);

  const onBadgeUnlock = useCallback(
    (badgeId: string) => {
      listener?.(badgeId);
    },
    [listener],
  );

  const value = useMemo(
    () => ({
      demoActive,
      demoProgress,
      enterDemo,
      exitDemo,
      setDemoProgress,
      onBadgeUnlock,
      registerBadgeListener,
    }),
    [demoActive, demoProgress, enterDemo, exitDemo, onBadgeUnlock, registerBadgeListener],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoMode outside DemoModeProvider");
  return ctx;
}

export function useActiveProgress() {
  const { demoActive, demoProgress, setDemoProgress, onBadgeUnlock } = useDemoMode();
  const real = useProgress({ enabled: !demoActive });

  const completePoi = useCallback(
    async (poiId: number, xp: number, badges: string[]) => {
      if (!demoActive) {
        await real.completePoi(poiId, xp, badges);
        badges.forEach(onBadgeUnlock);
        return;
      }
      if (demoProgress.visited_places.includes(poiId)) return;
      const nextVisited = [...demoProgress.visited_places, poiId];
      const nextBadges = Array.from(new Set([...demoProgress.badges_earned, ...badges]));
      setDemoProgress({
        total_xp: demoProgress.total_xp + xp,
        visited_places: nextVisited,
        badges_earned: nextBadges,
      });
      badges.forEach(onBadgeUnlock);
    },
    [demoActive, demoProgress, real, setDemoProgress, onBadgeUnlock],
  );

  const reset = useCallback(async () => {
    if (demoActive) {
      setDemoProgress(emptyDemo);
      return;
    }
    await real.reset();
  }, [demoActive, real, setDemoProgress]);

  return {
    progress: demoActive ? demoProgress : real.progress,
    hydrated: demoActive ? true : real.hydrated,
    completePoi,
    reset,
    isDemo: demoActive,
  };
}

export function computeNewBadges(currentEarned: string[], visitedAfter: number[]): string[] {
  return BADGES.filter((b) => !currentEarned.includes(b.id) && b.unlock(visitedAfter)).map(
    (b) => b.id,
  );
}
