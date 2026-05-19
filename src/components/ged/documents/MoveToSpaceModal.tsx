"use client";

import { useMemo, useState } from "react";
import { X, FolderOpen, AlertTriangle, Save } from "lucide-react";
import { useGedSpaces } from "@/hooks/useGedSpaces";
import { useBulkClassify } from "@/hooks/useGedDocuments";

interface Props {
  documentIds: string[];
  onClose: () => void;
  onMoved: (count: number) => void;
}

export function MoveToSpaceModal({ documentIds, onClose, onMoved }: Props) {
  const spacesQ = useGedSpaces({});
  const mut = useBulkClassify();
  const [spaceId, setSpaceId] = useState<string>("");
  const [folder, setFolder] = useState("");

  const allSpaces = useMemo(() => {
    if (!spacesQ.data) return [];
    return [...spacesQ.data.transverse, ...spacesQ.data.sites];
  }, [spacesQ.data]);

  async function submit() {
    if (!spaceId) return;
    try {
      const res = await mut.mutateAsync({
        documentIds,
        spaceId,
        folder: folder.trim() || undefined,
      });
      onMoved(res.updated);
      onClose();
    } catch {
      /* erreur rendue dans le bloc plus bas */
    }
  }

  const count = documentIds.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-start justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-ink">Déplacer dans un dossier</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              {count} document{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Dossier cible *
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            >
              <option value="">— Choisir un dossier —</option>
              {allSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ?? "📁"} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Sous-dossier (optionnel)
            </label>
            <input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Ex : 2026/Q2/Marchés"
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
              maxLength={200}
            />
            <p className="mt-0.5 text-[10.5px] text-ink-3">
              Chemin virtuel libre. N'affecte pas le stockage physique.
            </p>
          </div>

          {mut.isError && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {(mut.error as Error)?.message ?? "Erreur"}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!spaceId || mut.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {mut.isPending ? (
              <>Déplacement…</>
            ) : (
              <>
                <FolderOpen className="h-3.5 w-3.5" /> Déplacer
              </>
            )}
          </button>
          {!mut.isPending && (
            <span className="text-[11px] text-ink-3">
              <Save className="inline h-3 w-3" /> Audit auto
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
