import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GENERAL_SUGGESTIONS, answerGeneral } from "@/lib/galileo-brain";
import { GalileoAvatar } from "./Galileo";
import { GalileoChat } from "./GalileoChat";

export function MentorChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [talking, setTalking] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[1500] flex h-[85dvh] max-w-md flex-col gap-0 p-0 sm:h-[80dvh]">
        <DialogHeader className="border-b border-border/60 p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GalileoAvatar className="size-12" talking={talking} />
            <span>
              Galileo
              <span className="block text-[11px] font-normal text-muted-foreground">
                La tua guida per Padova
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <GalileoChat
          className="flex-1 p-3"
          intro="Salve, esploratore! Sono Galileo Galilei: a Padova ho insegnato per diciotto anni. Tocca una delle domande qui sotto o scrivimi tu. 🔭"
          suggestions={GENERAL_SUGGESTIONS}
          answer={answerGeneral}
          onTalkingChange={setTalking}
        />
      </DialogContent>
    </Dialog>
  );
}
