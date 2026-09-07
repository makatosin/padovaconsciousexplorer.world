import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/")({
  component: RootRedirect,
});

function RootRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/mappa" : "/auth", replace: true });
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Compass className="size-8 animate-pulse text-primary" />
        <span className="text-sm">Padova Conscious Explorer</span>
      </div>
    </div>
  );
}