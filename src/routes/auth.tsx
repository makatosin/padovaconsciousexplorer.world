import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AVATARS } from "@/lib/avatars";
import { z } from "zod";
import { checkNicknameAvailable } from "@/lib/progress.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Accedi · Padova Conscious Explorer" }],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email non valida").max(255),
  password: z.string().min(1, "Inserisci la password").max(72),
  nickname: z.string().trim().min(1, "Scegli un nickname").max(30).optional(),
  avatarId: z.number().int().min(1).max(6).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarId, setAvatarId] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/mappa", replace: true });
    });
  }, [navigate]);

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
      toast.error(err instanceof Error ? err.message : "Errore");
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
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
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

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          <Link to="/" className="hover:underline">← Torna alla home</Link>
        </p>
      </div>
    </div>
  );
}
