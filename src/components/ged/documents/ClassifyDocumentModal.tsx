"use client";

import { useMemo, useState } from "react";
import { X, Tags, Save, AlertTriangle } from "lucide-react";
import { useGedClassifications } from "@/hooks/useGedClassifications";
import { useGedSpaces } from "@/hooks/useGedSpaces";
import { useClassifyDocument } from "@/hooks/useGedDocuments";

interface Props {
  documentId: string;
  documentName: string;
  currentClassificationId?: string | null;
  currentSpaceId?: string | null;
  onClose: () => void;
  onClassified: () => void;
}

export function ClassifyDocumentModal({
  documentId,
  documentName,
  currentClassificationId,
  currentSpaceId,
  onClose,
  onClassified,
}: Props) {
  const classifQ = useGedClassifications();
  const spacesQ = useGedSpaces({});
  const mut = useClassifyDocument(documentId);

  const [classificationId, setClassificationId] = useState<string>(currentClassificationId ?? "");
  const [spaceId, setSpaceId] = useState<string>(currentSpaceId ?? "");
  const [notes, setNotes] = useState("");

  const allSpaces = useMemo(() => {
    if (!spacesQ.data) return [];
    return [...spacesQ.data.transverse, ...spacesQ.data.sites];
  }, [spacesQ.data]);

  async function submit() {
    if (!classificationId) return;
    try {
      await mut.mutateAsync({
        classificationId,
        spaceId: spaceId || null,
        notes: notes.trim() || undefined,
      });
      onClassified();
      onClose();
    } catch {
      /* erreur rendue plus bas */
    }
  }

  const valid = classificationId.length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-start justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-ink">Classer le document</h2>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{documentName}</p>
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
              Classification *
            </label>
            <select
              value={classificationId}
              onChange={(e) => setClassificationId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            >
              <option value="">— Choisir une classification —</option>
              {classifQ.data?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.prefix}] {c.name} · DUA {c.dua}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Espace cible
            </label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
            >
              <option value="">— Laisser le serveur décider —</option>
              {allSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon ?? "📁"} {s.name} ({s.spaceType})
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10.5px] text-ink-3">
              Si vide, l'espace sera dérivé de la catégorie de la classification.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Notes d'audit
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Raison de la classification manuelle…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
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
            disabled={!valid || mut.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Classer
          </button>
        </footer>
      </div>
    </div>
  );
}
