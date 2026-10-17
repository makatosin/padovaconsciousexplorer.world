import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BADGES } from "./pois";
import { useProgress } from "./use-progress";

type BadgeCtx = {
  onBadgeUnlock: (badgeId: string) => void;
  registerBadgeListener: (fn: (badgeId: string) => void) => () => void;
};

// Il context resta su globalThis: con il ricaricamento a caldo di Lovable il modulo può
// essere valutato due volte e due context diversi lasciano lo schermo bianco.
const g = globalThis as unknown as { __pceBadgeCtx?: React.Context<BadgeCtx | null> };
const Ctx = g.__pceBadgeCtx ?? (g.__pceBadgeCtx = createContext<BadgeCtx | null>(null));

export function GameProgressProvider({ children }: { children: React.ReactNode }) {
  const [listener, setListener] = useState<((id: string) => void) | null>(null);

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
    () => ({ onBadgeUnlock, registerBadgeListener }),
    [onBadgeUnlock, registerBadgeListener],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBadgeEvents() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBadgeEvents outside GameProgressProvider");
  return ctx;
}

export function useActiveProgress() {
  const { onBadgeUnlock } = useBadgeEvents();
  const real = useProgress();

  const completePoi = useCallback(
    async (poiId: number, xp: number, badges: string[]) => {
      await real.completePoi(poiId, xp, badges);
      badges.forEach(onBadgeUnlock);
    },
    [real, onBadgeUnlock],
  );

  return {
    progress: real.progress,
    hydrated: real.hydrated,
    completePoi,
  };
}

export function computeNewBadges(currentEarned: string[], visitedAfter: number[]): string[] {
  return BADGES.filter((b) => !currentEarned.includes(b.id) && b.unlock(visitedAfter)).map(
    (b) => b.id,
  );
}
