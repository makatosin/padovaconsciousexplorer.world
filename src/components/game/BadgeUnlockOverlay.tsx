import { useEffect, useState } from "react";
import { BADGES } from "@/lib/pois";
import { useDemoMode } from "@/lib/demo-mode";

export function BadgeUnlockOverlay() {
  const { registerBadgeListener } = useDemoMode();
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    return registerBadgeListener((id) => {
      setQueue((q) => [...q, id]);
    });
  }, [registerBadgeListener]);

  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 2800);
    return () => clearTimeout(t);
  }, [queue]);

  const currentId = queue[0];
  if (!currentId) return null;
  const badge = BADGES.find((b) => b.id === currentId);
  if (!badge) return null;

  const confetti = Array.from({ length: 18 });

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setQueue((q) => q.slice(1))}
      role="alert"
      aria-live="assertive"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((_, i) => {
          const left = (i * 53) % 100;
          const delay = (i % 6) * 0.08;
          const emoji = ["✨", "🎉", "⭐", "🌿"][i % 4];
          return (
            <span
              key={i}
              className="absolute text-2xl animate-fade-in"
              style={{
                left: `${left}%`,
                top: `${(i * 37) % 60}%`,
                animationDelay: `${delay}s`,
              }}
            >
              {emoji}
            </span>
          );
        })}
      </div>
      <div className="animate-scale-in rounded-3xl border-2 border-primary/40 bg-card p-8 text-center shadow-2xl mx-6">
        <img src={badge.art} alt="" className="mx-auto mb-4 size-28 animate-scale-in drop-shadow-lg" />
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          Nuovo badge sbloccato
        </div>
        <h2 className="mt-2 text-2xl font-bold">{badge.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{badge.description}</p>
        <p className="mt-4 text-[11px] text-muted-foreground">Tocca ovunque per continuare</p>
      </div>
    </div>
  );
}