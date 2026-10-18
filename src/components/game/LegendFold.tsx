import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const OPEN_KEY = "pce-legenda-aperta";

// Elenco delle tappe nella legenda della mappa, chiuso di base per lasciare spazio
// alla mappa. Si apre e si chiude con un tocco e il telefono ricorda la scelta.
export function LegendFold({
  done,
  total,
  children,
}: {
  done: number;
  total: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? "0" : "1");
      } catch {}
      return !o;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
      >
        <span className="flex-1">
          Tappe {done}/{total}
        </span>
        <span className="normal-case tracking-normal">{open ? "Chiudi" : "Apri"}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-1">{children}</div>}
    </>
  );
}
