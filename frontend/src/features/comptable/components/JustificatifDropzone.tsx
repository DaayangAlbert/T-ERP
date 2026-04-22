import { Paperclip, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { comptableTheme } from "@/features/comptable/theme";

interface JustificatifDropzoneProps {
  files: string[];
  onChange: (files: string[]) => void;
}

export function JustificatifDropzone({ files, onChange }: JustificatifDropzoneProps) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,251,0.86))] p-4 dark:border-white/14 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.78))]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>Justificatif obligatoire</p>
          <p className={`text-sm ${comptableTheme.secondaryText}`}>
            Ajoutez au moins une facture, un recu ou une preuve de paiement.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...files, `preuve-${files.length + 1}.pdf`])}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Ajouter une preuve
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {files.map((file) => (
          <span
            key={file}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black dark:border-white/12 dark:bg-slate-950 dark:text-white"
          >
            <Paperclip className="h-3.5 w-3.5" />
            {file}
          </span>
        ))}
        {!files.length ? <p className="text-xs text-rose-600 dark:text-rose-300">Aucun justificatif ajoute.</p> : null}
      </div>
    </div>
  );
}
