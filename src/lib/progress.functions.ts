// Funzioni lato client: parlano direttamente con Supabase (protetto dalle regole RLS),
// così l'app funziona anche come sito statico (GitHub Pages), senza un server.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { POIS, BADGES } from "./pois";

export type ProgressRow = {
  xp: number;
  visited_poi_ids: string[];
  badge_ids: string[];
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getProgress(): Promise<ProgressRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_progress")
    .select("xp, visited_poi_ids, badge_ids")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { xp: 0, visited_poi_ids: [], badge_ids: [] };
}

const CompleteInput = z.object({
  poiId: z.number().int(),
});

export async function completePoiProgress(opts: { data: unknown }): Promise<ProgressRow> {
  const data = CompleteInput.parse(opts.data);
  const userId = await requireUserId();
  const { data: cur } = await supabase
    .from("user_progress")
    .select("xp, visited_poi_ids, badge_ids")
    .eq("user_id", userId)
    .maybeSingle();
  const current: ProgressRow = cur ?? { xp: 0, visited_poi_ids: [], badge_ids: [] };
  const poiKey = String(data.poiId);
  if (current.visited_poi_ids.includes(poiKey)) return current;
  const poi = POIS.find((p) => p.id === data.poiId);
  if (!poi) throw new Error("POI sconosciuto");
  const nextVisited = [...current.visited_poi_ids, poiKey];
  const visitedNums = nextVisited.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  const earnedBadges = BADGES.filter((b) => b.unlock(visitedNums)).map((b) => b.id);
  const next: ProgressRow = {
    xp: current.xp + (poi.reward_xp ?? 0),
    visited_poi_ids: nextVisited,
    badge_ids: Array.from(new Set([...current.badge_ids, ...earnedBadges])),
  };
  const { error } = await supabase
    .from("user_progress")
    .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  // Data e ora della tappa completata (dato di ricerca). Un errore qui non deve
  // far perdere all'utente la tappa appena superata.
  const { error: visitErr } = await supabase
    .from("poi_visits")
    .upsert(
      { user_id: userId, poi_id: data.poiId },
      { onConflict: "user_id,poi_id", ignoreDuplicates: true },
    );
  if (visitErr) console.error("poi_visits:", visitErr.message);
  return next;
}

export async function resetProgress(): Promise<ProgressRow> {
  const userId = await requireUserId();
  const empty: ProgressRow = { xp: 0, visited_poi_ids: [], badge_ids: [] };
  const { error } = await supabase
    .from("user_progress")
    .upsert({ user_id: userId, ...empty, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return empty;
}

export async function getMyProfile() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email, nickname, avatar_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { display_name: null, email: null, nickname: null, avatar_id: 1 };
}

const UpdateProfileInput = z.object({
  nickname: z.string().trim().min(1, "Nickname obbligatorio").max(30),
  avatarId: z.number().int().min(1).max(6),
});

export async function updateMyProfile(opts: { data: unknown }) {
  const data = UpdateProfileInput.parse(opts.data);
  const userId = await requireUserId();
  // L'unicità del nickname è garantita dall'indice univoco sul database (errore 23505).
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname: data.nickname,
      display_name: data.nickname,
      avatar_id: data.avatarId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error("Nickname già in uso");
    }
    throw new Error(error.message);
  }
  return { ok: true };
}

const CheckNicknameInput = z.object({
  nickname: z.string().trim().min(1).max(30),
});

// Controllo preventivo "best effort": se il database non permette la verifica dal
// browser, si considera disponibile e decide l'indice univoco al momento del salvataggio.
export async function checkNicknameAvailable(opts: { data: unknown }) {
  const data = CheckNicknameInput.parse(opts.data);
  const { data: available, error } = await supabase.rpc("is_nickname_available", {
    _nickname: data.nickname,
  });
  if (error) return { available: true };
  return { available: Boolean(available) };
}

export async function startAppSession() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("app_sessions")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

const PingInput = z.object({ id: z.string().uuid() });

export async function pingAppSession(opts: { data: unknown }) {
  const data = PingInput.parse(opts.data);
  const userId = await requireUserId();
  const { error } = await supabase
    .from("app_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const MissionInput = z.object({ missionId: z.enum(["acqua", "mura", "verde"]) });

export async function setStartingMission(opts: { data: unknown }) {
  const data = MissionInput.parse(opts.data);
  const userId = await requireUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ starting_mission: data.missionId, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
