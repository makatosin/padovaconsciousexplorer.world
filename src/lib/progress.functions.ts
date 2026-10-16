import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { POIS, BADGES } from "./pois";

export type ProgressRow = {
  xp: number;
  visited_poi_ids: string[];
  badge_ids: string[];
};

export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressRow> => {
    const { data, error } = await context.supabase
      .from("user_progress")
      .select("xp, visited_poi_ids, badge_ids")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { xp: 0, visited_poi_ids: [], badge_ids: [] };
  });

const CompleteInput = z.object({
  poiId: z.number().int(),
});

export const completePoiProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompleteInput.parse(d))
  .handler(async ({ data, context }): Promise<ProgressRow> => {
    const { data: cur } = await context.supabase
      .from("user_progress")
      .select("xp, visited_poi_ids, badge_ids")
      .eq("user_id", context.userId)
      .maybeSingle();
    const current: ProgressRow = cur ?? { xp: 0, visited_poi_ids: [], badge_ids: [] };
    const poiKey = String(data.poiId);
    if (current.visited_poi_ids.includes(poiKey)) return current;
    const poi = POIS.find((p) => p.id === data.poiId);
    if (!poi) throw new Error("POI sconosciuto");
    const nextVisited = [...current.visited_poi_ids, poiKey];
    const visitedNums = nextVisited
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    const earnedBadges = BADGES.filter((b) => b.unlock(visitedNums)).map((b) => b.id);
    const next: ProgressRow = {
      xp: current.xp + (poi.reward_xp ?? 0),
      visited_poi_ids: nextVisited,
      badge_ids: Array.from(new Set([...current.badge_ids, ...earnedBadges])),
    };
    const { error } = await context.supabase
      .from("user_progress")
      .upsert({ user_id: context.userId, ...next, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    // Data e ora della tappa completata (dato di ricerca). Un errore qui non deve
    // far perdere all'utente la tappa appena superata.
    const { error: visitErr } = await context.supabase
      .from("poi_visits")
      .upsert(
        { user_id: context.userId, poi_id: data.poiId },
        { onConflict: "user_id,poi_id", ignoreDuplicates: true },
      );
    if (visitErr) console.error("poi_visits:", visitErr.message);
    return next;
  });

export const resetProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressRow> => {
    const empty: ProgressRow = { xp: 0, visited_poi_ids: [], badge_ids: [] };
    const { error } = await context.supabase
      .from("user_progress")
      .upsert({ user_id: context.userId, ...empty, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return empty;
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name, email, nickname, avatar_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { display_name: null, email: null, nickname: null, avatar_id: 1 };
  });

const UpdateProfileInput = z.object({
  nickname: z.string().trim().min(1, "Nickname obbligatorio").max(30),
  avatarId: z.number().int().min(1).max(6),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: available, error: availErr } = await supabaseAdmin.rpc(
      "is_nickname_available",
      { _nickname: data.nickname, _exclude_user_id: context.userId },
    );
    if (availErr) throw new Error(availErr.message);
    if (!available) throw new Error("Nickname già in uso");
    const { error } = await context.supabase
      .from("profiles")
      .update({
        nickname: data.nickname,
        display_name: data.nickname,
        avatar_id: data.avatarId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new Error("Nickname già in uso");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

const CheckNicknameInput = z.object({
  nickname: z.string().trim().min(1).max(30),
});

export const checkNicknameAvailable = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CheckNicknameInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: available, error } = await supabaseAdmin.rpc("is_nickname_available", {
      _nickname: data.nickname,
    });
    if (error) throw new Error(error.message);
    return { available: Boolean(available) };
  });
export const startAppSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_sessions")
      .insert({ user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

const PingInput = z.object({ id: z.string().uuid() });

export const pingAppSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("app_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MissionInput = z.object({ missionId: z.enum(["acqua", "mura", "verde"]) });

export const setStartingMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MissionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ starting_mission: data.missionId, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
