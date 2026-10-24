import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { Trophy, MapPin, CheckCircle2, Circle, Pencil, Check, X, Loader2, ChevronDown } from "lucide-react";
import { LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { POIS, BADGES, MISSIONS } from "@/lib/pois";
import { useActiveProgress as useProgress } from "@/lib/game-progress";
import { getMyProfile, updateMyProfile, checkNicknameAvailable } from "@/lib/progress.functions";
import { AVATARS, getAvatar } from "@/lib/avatars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HomeScreenTip } from "@/components/game/HomeScreenTip";

export const Route = createFileRoute("/_authenticated/profilo")({
  head: () => ({ meta: [{ title: "Profilo · Padova Conscious Explorer" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { progress } = useProgress();
  const qc = useQueryClient();
  const getProfileFn = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);
  const checkNicknameFn = useServerFn(checkNicknameAvailable);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        return { display_name: null, email: null, nickname: null, avatar_id: 1 };
      }
      return getProfileFn();
    },
    enabled: hasSession === true,
  });

  const [badgesOpen, setBadgesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editAvatar, setEditAvatar] = useState(1);
  const [saving, setSaving] = useState(false);
  const [nkStatus, setNkStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "same" | "invalid"
  >("idle");
  const nkCacheRef = useRef<Map<string, boolean>>(new Map());

  const openEdit = () => {
    setEditNickname(profileQ.data?.nickname ?? "");
    setEditAvatar(profileQ.data?.avatar_id ?? 1);
    setNkStatus("same");
    nkCacheRef.current.clear();
    setEditOpen(true);
  };

  const currentNickname = profileQ.data?.nickname ?? "";
  useEffect(() => {
    if (!editOpen) return;
    const nk = editNickname.trim();
    if (!nk) {
      setNkStatus("invalid");
      return;
    }
    if (nk.toLowerCase() === currentNickname.trim().toLowerCase()) {
      setNkStatus("same");
      return;
    }
    const key = nk.toLowerCase();
    const cached = nkCacheRef.current.get(key);
    if (cached !== undefined) {
      setNkStatus(cached ? "available" : "taken");
      return;
    }
    setNkStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const { available } = await checkNicknameFn({ data: { nickname: nk } });
        nkCacheRef.current.set(key, available);
        setNkStatus((prev) => (prev === "checking" ? (available ? "available" : "taken") : prev));
      } catch {
        setNkStatus("idle");
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [editNickname, editOpen, currentNickname, checkNicknameFn]);

  const saveEdit = async () => {
    const nk = editNickname.trim();
    if (!nk) {
      toast.error("Nickname obbligatorio");
      return;
    }
    if (nkStatus === "taken" || nkStatus === "checking" || nkStatus === "invalid") return;
    setSaving(true);
    try {
      await updateProfileFn({ data: { nickname: nk, avatarId: editAvatar } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      nkCacheRef.current.clear();
      toast.success("Profilo aggiornato");
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  };

  const total = POIS.length;
  const visitedCount = progress.visited_places.length;
  const pct = Math.min(100, (visitedCount / total) * 100);
  const visited = POIS.filter((p) => progress.visited_places.includes(p.id));
  const remaining = POIS.filter((p) => !progress.visited_places.includes(p.id));
  const earnedCount = BADGES.filter((b) => progress.badges_earned.includes(b.id)).length;


  return (
    <div className="h-full overflow-y-auto pb-4">
      <Toaster position="top-center" richColors />
      {hasSession === false && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
            🔒
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold">Sessione non attiva</h1>
            <p className="text-sm text-muted-foreground">
              Accedi al tuo account per vedere il profilo, i badge e i luoghi visitati.
            </p>
          </div>
          <Button asChild className="w-full max-w-xs">
            <Link to="/auth">
              <LogIn className="mr-2 size-4" /> Accedi
            </Link>
          </Button>
        </div>
      )}
      {hasSession === true && (
      <>

      {/* Header */}
      <header className="bg-gradient-to-b from-primary/10 to-transparent px-4 pt-6 pb-4">
        {(() => {
          const av = getAvatar(profileQ.data?.avatar_id);
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex size-14 items-center justify-center rounded-full border-2 text-3xl shadow ${av.bg}`}
                aria-label={av.label}
              >
                {av.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold">
                  {profileQ.data?.display_name ?? "Esploratore"}
                </h1>
                {profileQ.data?.nickname && (
                  <p className="truncate text-xs font-semibold text-primary">
                    @{profileQ.data.nickname}
                  </p>
                )}
                <p className="truncate text-[11px] text-muted-foreground">
                  {profileQ.data?.email ?? ""}
                </p>
              </div>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openEdit}
                    className="shrink-0"
                  >
                    <Pencil className="mr-1 size-3.5" /> Modifica
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Modifica profilo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-nk">Nickname</Label>
                      <div className="relative">
                        <Input
                          id="edit-nk"
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          maxLength={30}
                          className="pr-9"
                          aria-invalid={nkStatus === "taken" || nkStatus === "invalid"}
                          aria-describedby="edit-nk-status"
                        />
                        <div
                          className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
                          aria-hidden="true"
                        >
                          {nkStatus === "checking" && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          )}
                          {(nkStatus === "available" || nkStatus === "same") && (
                            <Check className="size-4 text-primary" />
                          )}
                          {nkStatus === "taken" && <X className="size-4 text-destructive" />}
                        </div>
                      </div>
                      <p
                        id="edit-nk-status"
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className={`text-[11px] ${
                          nkStatus === "taken" || nkStatus === "invalid"
                            ? "text-destructive"
                            : nkStatus === "available"
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {nkStatus === "checking" && "Verifica disponibilità…"}
                        {nkStatus === "available" && "Nickname disponibile"}
                        {nkStatus === "taken" && "Nickname già in uso"}
                        {nkStatus === "same" && "Il tuo nickname attuale"}
                        {nkStatus === "invalid" && "Inserisci un nickname"}
                        {nkStatus === "idle" && "\u00a0"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Avatar</Label>
                      <div className="grid grid-cols-6 gap-2">
                        {AVATARS.map((a) => {
                          const active = editAvatar === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setEditAvatar(a.id)}
                              aria-label={a.label}
                              className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition ${
                                active
                                  ? "border-primary bg-primary/10 scale-105 shadow"
                                  : "border-border bg-muted/40 hover:border-primary/50"
                              }`}
                            >
                              {a.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
                      Annulla
                    </Button>
                    <Button
                      onClick={saveEdit}
                      disabled={
                        saving ||
                        nkStatus === "checking" ||
                        nkStatus === "taken" ||
                        nkStatus === "invalid"
                      }
                    >
                      {saving ? "Salvo…" : "Salva"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          );
        })()}

        {/* Barra del progresso: toccandola si aprono i badge */}
        <Card className="mt-4 p-0">
          <button
            onClick={() => setBadgesOpen((o) => !o)}
            aria-expanded={badgesOpen}
            className="flex w-full items-center gap-3 p-3 text-left"
          >
            <Trophy className="size-5 text-primary" />
            <div className="flex-1">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Progresso
                </span>
                <span className="text-sm font-bold text-primary">
                  Badge {earnedCount}/{BADGES.length} 🏅
                </span>
              </div>
              <ProgressBar value={pct} className="h-2" />
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {visitedCount} di {total} tappe completate
                </span>
                <span className="flex items-center gap-0.5 font-medium text-primary">
                  {badgesOpen ? "Nascondi badge" : "Vedi badge"}
                  <ChevronDown
                    className={`size-3.5 transition-transform ${badgesOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </div>
            </div>
          </button>
          {badgesOpen && (
            <div className="grid grid-cols-2 gap-2 border-t border-border/60 p-3">
              {BADGES.map((b) => {
                const earned = progress.badges_earned.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`flex flex-col items-center rounded-xl p-2 text-center ${
                      earned ? "bg-primary/5" : ""
                    }`}
                  >
                    <img
                      src={b.art}
                      alt=""
                      className={`mb-1 size-16 ${earned ? "" : "opacity-40 grayscale"}`}
                    />
                    <div className="text-[11px] font-semibold leading-tight">{b.title}</div>
                    <div className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
                      {earned ? "Ottenuto!" : b.description}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </header>

      {/* Missioni tematiche */}
      <section className="px-4 pb-5">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="size-3.5" /> Missioni
        </h2>
        <ul className="space-y-2">
          {MISSIONS.map((m) => {
            const done = m.poiIds.filter((id) => progress.visited_places.includes(id)).length;
            const complete = done === m.poiIds.length;
            return (
              <li key={m.id}>
                <Card className={`p-3 ${complete ? "border-green-300 bg-green-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <img
                      src={m.badgeArt}
                      alt=""
                      className={`size-9 shrink-0 ${complete ? "" : "opacity-50 grayscale"}`}
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {m.emoji} {m.title}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {done}/{m.poiIds.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {complete ? m.finale : m.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.poiIds.map((id) => {
                      const poi = POIS.find((p) => p.id === id);
                      const visitedPoi = progress.visited_places.includes(id);
                      return (
                        <span
                          key={id}
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            visitedPoi
                              ? "bg-green-100 font-semibold text-green-800 ring-1 ring-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {visitedPoi ? "✓ " : ""}
                          {poi?.name}
                        </span>
                      );
                    })}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Remaining */}
      <section className="px-4 pb-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Circle className="size-3.5" /> DA VISITARE ({remaining.length})
        </h2>
        {remaining.length === 0 ? (
          <Card className="border-primary/50 bg-primary/5 p-3 text-center text-sm">
            🎉 Complimenti! Hai completato tutte le tappe.
          </Card>
        ) : (
          <ul className="space-y-1.5">
            {remaining.map((poi) => (
              <li key={poi.id}>
                <Card className="flex items-center gap-2 p-2.5">
                  <MapPin className="size-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{poi.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {poi.challenge_type === "FOTO" ? "📸 Foto" : poi.challenge_type === "AUDIO" ? "🔊 Audio" : poi.challenge_type === "CACCIA" ? "🔍 Caccia al dettaglio" : "🧩 Quiz"}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <HomeScreenTip variant="profile" className="mx-4 mb-4" />

      {/* Visited */}
      <section className="px-4 pb-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-green-600" /> LUOGHI VISITATI ({visited.length})
        </h2>
        {visited.length === 0 ? (
          <Card className="p-3 text-center text-xs text-muted-foreground">
            Nessuna tappa ancora completata. Vai sulla mappa e inizia l'avventura!
          </Card>
        ) : (
          <ul className="space-y-1.5">
            {visited.map((poi) => (
              <li key={poi.id}>
                <Card className="flex items-center gap-2 border-green-300 bg-green-50 p-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{poi.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {poi.challenge_type === "FOTO" ? "📸 Foto" : poi.challenge_type === "AUDIO" ? "🔊 Audio" : poi.challenge_type === "CACCIA" ? "🔍 Caccia al dettaglio" : "🧩 Quiz"}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="px-4 pt-4 pb-2 text-center text-[10px] text-muted-foreground">
        Versione 1.11 · 24/10/2026
      </p>
      </>
      )}
    </div>
  );
}