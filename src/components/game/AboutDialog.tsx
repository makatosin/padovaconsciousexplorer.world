import { useEffect, useState } from "react";
import { Compass, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SEEN_KEY = "pce-about-seen-v1";

// Nudge trasparente (parr. 2.2.1 e 2.4.4 della tesi): l'app dichiara perché propone
// queste tappe e come tratta la posizione, prima di iniziare e ogni volta che serve.
export function useAboutDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);
  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {}
    }
  };
  return { open, onOpenChange, show: () => setOpen(true) };
}

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1500] max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>Perché queste tappe?</DialogTitle>
          <DialogDescription>
            Padova Conscious Explorer fa parte di una tesi dell'Università di Padova.
          </DialogDescription>
        </DialogHeader>

        <section className="flex gap-3 text-sm leading-relaxed">
          <Compass className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>
            Il centro storico e i grandi monumenti sono spesso affollati, mentre molti luoghi di
            valore restano quasi sconosciuti. L'app ti propone cinque di questi luoghi per{" "}
            <strong>distribuire i visitatori</strong> in modo più equilibrato e farti scoprire
            una Padova meno battuta.
          </p>
        </section>

        <section className="flex gap-3 text-sm leading-relaxed">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>
            Punti, badge e sfide servono a rendere la scoperta un gioco.{" "}
            <strong>Sei sempre libero</strong> di ignorare i suggerimenti, scegliere le tappe che
            vuoi e visitarle nell'ordine che preferisci: non ci sono penalità.
          </p>
        </section>

        <section className="flex gap-3 text-sm leading-relaxed">
          <Lock className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="space-y-2">
            <p>
              <strong>La tua posizione non lascia il telefono.</strong> Viene letta solo quando
              tocchi il pulsante 📍 e serve a controllare, sul dispositivo, se sei vicino a una
              tappa. Non è tracciata in continuo né salvata.
            </p>
            <p>
              Salviamo solo il tuo profilo (email, soprannome, avatar), i punti, le tappe
              completate e i badge. Le foto delle sfide e i messaggi al Mentore Storico sono
              inviati a un servizio di intelligenza artificiale per la valutazione e la risposta,
              e non vengono conservati dall'app.
            </p>
          </div>
        </section>

        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Ho capito, iniziamo
        </Button>
      </DialogContent>
    </Dialog>
  );
}
