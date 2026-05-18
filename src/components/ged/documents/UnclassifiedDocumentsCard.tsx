"use client";

import { useState } from "react";
import { FileWarning, FileText, ExternalLink, Tags, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useUnclassifiedDocuments, type UnclassifiedDocument } from "@/hooks/useGedDocuments";
import { ClassifyDocumentModal } from "./ClassifyDocumentModal";

function fmtSize(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} Mo`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} Ko`;
  return `${b} o`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  /** Si fourni, affiché en haut de la carte. */
  readOnly?: boolean;
  /** N'inclut PAS les docs des dernières 24 h par défaut (pour réduire le bruit
   *  des uploads très récents). Passe `includeRecent` pour les voir aussi. */
  includeRecent?: boolean;
}

export function UnclassifiedDocumentsCard({ readOnly = false, includeRecent = false }: Props) {
  const { data, isLoading } = useUnclassifiedDocuments({ includeRecent });
  const [classifying, setClassifying] = useState<UnclassifiedDocument | null>(null);

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-600" />
          <h2 className="text-[13.5px] font-semibold text-ink">
            Documents à classer manuellement ({data?.total ?? "…"})
          </h2>
        </div>
        {data && data.total > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
            Action requise
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-[12px] text-ink-3">Chargement…</div>
      ) : !data || data.documents.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-emerald-500/70" />
          <p className="mt-2 text-[12.5px] text-ink-3">
            Tous les documents sont correctement classés.
          </p>
        </div>
      ) : (
        <ul className="max-h-[480px] divide-y divide-line overflow-y-auto">
          {data.documents.map((d) => (
            <li key={d.id} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                    <span className="text-[12.5px] font-semibold text-ink">{d.name}</span>
                    {d.missing.classification && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                        Pas de classification
                      </span>
                    )}
                    {d.missing.space && (
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-700">
                        Pas d'espace
                      </span>
                    )}
                    {d.ageDays >= 7 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-700">
                        <AlertTriangle className="h-2.5 w-2.5" /> {d.ageDays}j
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink-3">
                    <span>par {d.authorName}{d.authorRole && ` · ${d.authorRole}`}</span>
                    <span>{fmtSize(d.sizeBytes)}</span>
                    <span className="font-mono">{fmtDate(d.createdAt)}</span>
                    {d.siteCode && <span>chantier {d.siteCode}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink-3 hover:bg-surface-alt"
                    title="Ouvrir le fichier"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setClassifying(d)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-violet-600 px-2 text-[11px] font-semibold text-white hover:bg-violet-700"
                    >
                      <Tags className="h-3 w-3" /> Classer
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {classifying && (
        <ClassifyDocumentModal
          documentId={classifying.id}
          documentName={classifying.name}
          currentClassificationId={classifying.classificationId}
          currentSpaceId={classifying.spaceId}
          onClose={() => setClassifying(null)}
          onClassified={() => {
            /* le hook invalide automatiquement la query */
          }}
        />
      )}
    </section>
  );
}
