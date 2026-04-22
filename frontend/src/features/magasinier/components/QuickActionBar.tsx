import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, MessageSquareText, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QuickActionBarProps {
  onEntry: () => void;
  onExit: () => void;
  onTransfer: () => void;
  onReport: () => void;
  onChat: () => void;
}

export function QuickActionBar({
  onEntry,
  onExit,
  onTransfer,
  onReport,
  onChat,
}: QuickActionBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Button className="justify-start gap-2 px-4 py-4" onClick={onEntry}>
        <ArrowUpCircle className="h-4 w-4" />
        Nouvelle entree
      </Button>
      <Button className="justify-start gap-2 px-4 py-4" variant="outline" onClick={onExit}>
        <ArrowDownCircle className="h-4 w-4" />
        Nouvelle sortie
      </Button>
      <Button className="justify-start gap-2 px-4 py-4" variant="outline" onClick={onTransfer}>
        <ArrowLeftRight className="h-4 w-4" />
        Nouveau transfert
      </Button>
      <Button className="justify-start gap-2 px-4 py-4" variant="outline" onClick={onReport}>
        <Siren className="h-4 w-4" />
        Nouveau signalement
      </Button>
      <Button className="justify-start gap-2 px-4 py-4" variant="outline" onClick={onChat}>
        <MessageSquareText className="h-4 w-4" />
        Ouvrir la messagerie
      </Button>
    </div>
  );
}
