import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Map, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DemoModeProvider, useDemoMode } from "@/lib/demo-mode";
import { BadgeUnlockOverlay } from "@/components/game/BadgeUnlockOverlay";
import { checkDemoSession, clearDemoSession } from "@/lib/demo-auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };
    // No Supabase session — allow only if the server-verified demo cookie is present.
    try {
      let demoToken: string | undefined;
      try {
        demoToken = sessionStorage.getItem("pce-demo-token") ?? undefined;
      } catch {}
      const { ok } = await checkDemoSession({ data: { demoToken } });
      if (ok) {
        try {
          sessionStorage.setItem("pce-demo", "1");
        } catch {}
        return { user: null };
      }
    } catch {}
    let hadDemoFlag = false;
    try {
      hadDemoFlag = sessionStorage.getItem("pce-demo") === "1";
      sessionStorage.removeItem("pce-demo");
      sessionStorage.removeItem("pce-demo-token");
    } catch {}
    throw redirect({
      to: "/auth",
      search: hadDemoFlag ? { reason: "demo-expired" } : {},
    });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <DemoModeProvider>
      <AuthedLayoutInner />
    </DemoModeProvider>
  );
}

function AuthedLayoutInner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { demoActive, exitDemo } = useDemoMode();

  const signOut = async () => {
    if (demoActive) {
      try {
        await clearDemoSession();
      } catch {}
      try {
        sessionStorage.removeItem("pce-demo-token");
      } catch {}
      exitDemo();
      navigate({ to: "/auth", replace: true });
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("A presto!");
    navigate({ to: "/auth", replace: true });
  };

  const isMap = pathname === "/mappa";
  const isProfile = pathname === "/profilo";

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Bottom tab bar */}
        <nav className="relative z-[600] flex items-stretch border-t border-border/60 bg-card/95 backdrop-blur">
          <TabLink to="/mappa" active={isMap} icon={<Map className="size-5" />} label="Mappa" />
          <TabLink to="/profilo" active={isProfile} icon={<User className="size-5" />} label="Profilo" />
          <button
            onClick={signOut}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            aria-label={demoActive ? "Esci dalla demo" : "Esci"}
          >
            <LogOut className="size-5" />
            <span>{demoActive ? "Esci demo" : "Esci"}</span>
          </button>
        </nav>
        <BadgeUnlockOverlay />
    </div>
  );
}

function TabLink({
  to,
  active,
  icon,
  label,
}: {
  to: "/mappa" | "/profilo";
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary shadow-[0_4px_12px_hsl(var(--primary)/0.45)]"
        />
      )}
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-primary/10"
        />
      )}
      {icon}
      <span>{label}</span>
    </Link>
  );
}