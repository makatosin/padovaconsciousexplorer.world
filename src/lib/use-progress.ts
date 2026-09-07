import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getProgress,
  completePoiProgress,
  resetProgress,
  type ProgressRow,
} from "./progress.functions";

export type Progress = {
  total_xp: number;
  visited_places: number[];
  badges_earned: string[];
};

const empty: Progress = { total_xp: 0, visited_places: [], badges_earned: [] };

function toClient(row: ProgressRow): Progress {
  return {
    total_xp: row.xp,
    visited_places: row.visited_poi_ids
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
    badges_earned: row.badge_ids,
  };
}

export function useProgress(options?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const getFn = useServerFn(getProgress);
  const completeFn = useServerFn(completePoiProgress);
  const resetFn = useServerFn(resetProgress);

  const query = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        return { xp: 0, visited_poi_ids: [], badge_ids: [] } as ProgressRow;
      }
      return getFn();
    },
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });

  const progress = query.data ? toClient(query.data) : empty;
  const hydrated = query.isFetched;

  const completePoi = useCallback(
    async (poiId: number, _xp?: number, _badges?: string[]) => {
      const next = await completeFn({ data: { poiId } });
      qc.setQueryData(["progress"], next);
    },
    [completeFn, qc],
  );

  const reset = useCallback(async () => {
    const next = await resetFn();
    qc.setQueryData(["progress"], next);
  }, [resetFn, qc]);

  return { progress, hydrated, completePoi, reset };
}