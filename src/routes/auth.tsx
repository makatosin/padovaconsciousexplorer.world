import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Eye, EyeOff, FlaskConical } from "lucide-react";
import { AVATARS } from "@/lib/avatars";
import { z } from "zod";
import { checkNicknameAvailable } from "@/lib/progress.functions";
import { verifyDemoPassword } from "@/lib/demo-auth.functions";
import { setDemoToken } from "@/lib/demo-token";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Accedi · Padova Conscious Explorer" }],
  }),
  validateSearch: (s: Record<string, unknown>): { reason?: string } =>
    typeof s.reason === "string" ? { reason: s.reason } : {},
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email non valida").max(255),
  password: z.string().min(1, "Inserisci la password").max(72),
  nickname: z.string().trim().min(1, "Scegli un nickname").max(30).optional(),
  avatarId: z.number().int().min(1).max(6).optional(),
});

// Gli errori di Supabase arrivano in inglese: li traduciamo per gli studenti.
function authErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  const code = e?.code ?? "";
  const msg = (e?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "Email o password errate.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Esiste già un account con questa email: accedi.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Email non ancora confermata: apri il link che ti abbiamo inviato.";
  if (code === "weak_password" || msg.includes("password should") || msg.includes("weak"))
    return "Password troppo debole: usa almeno 6 caratteri e non una parola comune.";
  if (code === "email_address_invalid" || msg.includes("invalid format") || msg.includes("email address"))
    return "Email non valida.";
  if (code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many"))
    return "Troppi tentativi: aspetta qualche minuto e riprova.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Connessione assente: controlla internet e riprova.";
  return "Qualcosa è andato storto. Riprova tra poco.";
}

function AuthPage() {
  const navigate = useNavigate();
  const { reason } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoPw, setDemoPw] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const startDemo = () => {
    setDemoError(null);
    setDemoPw("");
    setDemoOpen(true);
  };

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPw) return;
    setDemoBusy(true);
    setDemoError(null);
    try {
      const { ok, demoToken } = await verifyDemoPassword({ data: { password: demoPw } });
      if (!ok) {
        const msg = "Password demo errata. Riprova.";
        setDemoError(msg);
        toast.error(msg);
        setDemoBusy(false);
        return;
      }
      try {
        sessionStorage.setItem("pce-demo", "1");
      } catch {}
      if (demoToken) setDemoToken(demoToken);
      setDemoOpen(false);
      navigate({ to: "/mappa", replace: true });
    } catch {
      const msg = "Impossibile verificare la password ora. Riprova.";
      setDemoError(msg);
      toast.error(msg);
    } finally {
      setDemoBusy(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/mappa", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (reason === "demo-expired") {
      toast.error("Sessione demo scaduta", {
        description: "Reinserisci la password per rientrare nella demo.",
      });
      // Clear the flag from the URL so it doesn't reappear on refresh.
      navigate({ to: "/auth", replace: true, search: {} });
    }
  }, [reason, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      email,
      password,
      nickname: mode === "signup" ? nickname : undefined,
      avatarId: mode === "signup" ? avatarId : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (mode === "signup" && parsed.data.password.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { available } = await checkNicknameAvailable({
          data: { nickname: parsed.data.nickname! },
        });
        if (!available) {
          toast.error("Nickname già in uso, scegline un altro");
          setBusy(false);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/mappa`,
            data: {
              display_name: parsed.data.nickname,
              nickname: parsed.data.nickname,
              avatar_id: parsed.data.avatarId,
            },
          },
        });
        if (error) throw error;
        if (!signUpData.session) {
          setPendingEmail(parsed.data.email);
          toast.success("Account creato! Controlla la tua email per confermarlo.");
          setBusy(false);
          return;
        }
        toast.success("Account creato! Benvenuto.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bentornato!");
      }
      navigate({ to: "/mappa", replace: true });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/art/logo.svg"
            alt="Logo di Padova Conscious Explorer"
            className="mb-3 size-24 drop-shadow-xl"
          />
          <h1 className="text-xl font-bold tracking-tight">Padova Conscious Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Accedi al tuo viaggio" : "Crea il tuo account"}
          </p>
        </div>

        {pendingEmail && (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-[13px] leading-snug">
            <p className="font-semibold">Conferma la tua email</p>
            <p className="mt-1 text-muted-foreground">
              Ti abbiamo inviato un link a <span className="font-medium">{pendingEmail}</span>. Aprilo
              per attivare l'account, poi torna qui e accedi.
            </p>
          </div>
        )}

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="nk">Nickname</Label>
                  <Input
                    id="nk"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoComplete="nickname"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Scegli il tuo avatar</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((a) => {
                      const active = avatarId === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setAvatarId(a.id)}
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
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <div className="relative">
                <Input
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-[11px] text-muted-foreground">Almeno 6 caratteri.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Non hai un account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Registrati
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setMode("login")}
                >
                  Accedi
                </button>
              </>
            )}
          </div>
        </Card>

        <div className="mt-6">
          <div className="relative mb-3 flex items-center">
            <div className="flex-1 border-t border-border/60" />
            <span className="px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              oppure
            </span>
            <div className="flex-1 border-t border-border/60" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={startDemo}
          >
            <FlaskConical className="mr-2 size-4" />
            Prova la demo (senza account)
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Esplora l'app senza registrarti. I progressi non verranno salvati.
          </p>
        </div>
      </div>

      <Dialog
        open={demoOpen}
        onOpenChange={(o) => {
          setDemoOpen(o);
          if (!o) {
            setDemoPw("");
            setDemoError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Accesso demo</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitDemo} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="demo-pw">Password demo</Label>
              <Input
                id="demo-pw"
                type="password"
                value={demoPw}
                onChange={(e) => {
                  setDemoPw(e.target.value);
                  if (demoError) setDemoError(null);
                }}
                autoFocus
                required
                aria-invalid={demoError ? true : undefined}
              />
              {demoError ? (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 text-[12px] font-medium text-destructive"
                >
                  <AlertCircle className="mt-[1px] size-3.5 shrink-0" />
                  <span>{demoError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  La demo è riservata. Inserisci la password per continuare.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={demoBusy || !demoPw} className="w-full">
                {demoBusy ? "Verifica…" : "Entra in demo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
