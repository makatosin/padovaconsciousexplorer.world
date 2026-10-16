import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { pingAppSession, startAppSession } from "./progress.functions";

const PING_EVERY_MS = 60_000;

// Tempo trascorso nell'app (dato di ricerca): una sessione inizia quando l'app è in
// primo piano e viene aggiornata ogni minuto. Quando l'app va in background il conteggio
// si ferma; al ritorno parte una nuova sessione, così il tempo fuori dall'app non conta.
export function useAppSession(enabled: boolean) {
  const startFn = useServerFn(startAppSession);
  const pingFn = useServerFn(pingAppSession);

  useEffect(() => {
    if (!enabled) return;
    let sessionId: string | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let starting = false;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (sessionId) pingFn({ data: { id: sessionId } }).catch(() => {});
      sessionId = null;
    };

    const start = async () => {
      if (timer || starting || document.visibilityState !== "visible") return;
      starting = true;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session || cancelled) return;
        const res = await startFn();
        if (cancelled) return;
        sessionId = res.id;
        timer = setInterval(() => {
          if (sessionId) pingFn({ data: { id: sessionId } }).catch(() => {});
        }, PING_EVERY_MS);
      } catch {
        // Il tracciamento del tempo non deve mai bloccare l'app.
      } finally {
        starting = false;
      }
    };

    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [enabled, startFn, pingFn]);
}
