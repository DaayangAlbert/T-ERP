"use client";

import { useState, useEffect } from "react";
import { X, Folder, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { Confidentiality } from "@prisma/client";
import { useGedSpaceDetail, useUpdateSpaceAccessPolicy } from "@/hooks/useGedSpaces";
import { ImportDocumentModal } from "@/components/ged/documents/ImportDocumentModal";

const CATEGORY_LABEL: Record<string, { label: string; icon: string }> = {
  MARKETS: { label: "Marchés & contrats", icon: "📜" },
  TECHNICAL: { label: "Techniques", icon: "📐" },
  HR: { label: "Ressources humaines", icon: "👥" },
  ACCOUNTING: { label: "Comptables", icon: "💰" },
  LEGAL: { label: "Juridiques", icon: "⚖" },
  QSE: { label: "Qualité Sécurité Env.", icon: "🛡" },
  OTHER: { label: "Autres", icon: "📁" },
};

const CONF_LABEL: Record<Confidentiality, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  RESTRICTED: "Restreint",
  CONFIDENTIAL: "Confidentiel",
};

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

interface Props {
  spaceId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

export function SpaceDetailDrawer({ spaceId, readOnly, onClose }: Props) {
  const { data, isLoading, isError } = useGedSpaceDetail(spaceId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confEdit, setConfEdit] = useState<Confidentiality | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const mut = useUpdateSpaceAccessPolicy(spaceId ?? "");

  useEffect(() => {
    if (data?.space.confidentiality) setConfEdit(data.space.confidentiality);
    setSubmitErr(null);
  }, [data?.space.id, data?.space.confidentiality]);

  if (!spaceId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[480px]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[22px]">{data?.space.icon ?? "📁"}</span>
              <h2 className="truncate text-[15px] font-bold text-ink">{data?.space.name ?? "…"}</h2>
            </div>
            {data?.space.code && (
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">{data.space.code}</div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!readOnly && data?.space.id && (
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-[11.5px] font-semibold text-white hover:bg-violet-700"
              >
                <Upload className="h-3.5 w-3.5" /> Importer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-48 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              Impossible de charger les détails de l'espace.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Description + responsable */}
              {data.space.description && (
                <p className="text-[12.5px] text-ink-3">{data.space.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Documents</div>
                  <div className="mt-0.5 text-[18px] font-bold text-ink">{data.stats.documentsCount.toLocaleString("fr-FR")}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Volume</div>
                  <div className="mt-0.5 text-[14px] font-semibold text-ink">{formatVolume(data.stats.volumeBytes)}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Indexation</div>
                  <div className="mt-0.5 text-[14px] font-semibold text-ink">{data.stats.indexationRate}%</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Catégories</div>
                  <div className="mt-0.5 text-[14px] font-semibold text-ink">{data.stats.categoriesCount}</div>
                </div>
              </div>
              {data.space.responsible && (
                <div className="rounded-lg border border-line p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Responsable</div>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-ink">{data.space.responsible.name}</div>
                  <div className="text-[11.5px] text-ink-3">{data.space.responsible.email}</div>
                </div>
              )}
              {data.space.site && (
                <div className="rounded-lg border border-line p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Chantier rattaché</div>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-ink">{data.space.site.name}</div>
                  <div className="text-[11.5px] text-ink-3">
                    {data.space.site.code} · {data.space.site.client} · {data.space.site.status} · avancement{" "}
                    {data.space.site.progress}%
                  </div>
                  {data.space.site.manager && (
                    <div className="text-[11.5px] text-ink-3">Conducteur : {data.space.site.manager}</div>
                  )}
                </div>
              )}

              {/* Arborescence */}
              <section>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Arborescence</h3>
                {data.tree.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line p-3 text-center text-[11.5px] text-ink-3">
                    Aucun document classé dans cet espace.
                  </div>
                ) : (
                  <ul className="rounded-lg border border-line bg-white">
                    {data.tree.map((cat) => {
                      const meta = CATEGORY_LABEL[cat.category] ?? { label: cat.category, icon: "📁" };
                      const open = expanded.has(cat.category);
                      return (
                        <li key={cat.category} className="border-b border-line last:border-b-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((s) => {
                                const next = new Set(s);
                                if (next.has(cat.category)) next.delete(cat.category);
                                else next.add(cat.category);
                                return next;
                              })
                            }
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-alt/30"
                          >
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-ink-3" />
                            )}
                            <span className="text-[14px]">{meta.icon}</span>
                            <span className="flex-1 truncate text-[12.5px] font-semibold text-ink">{meta.label}</span>
                            <span className="font-mono text-[11px] text-ink-3">
                              {cat.count} · {formatVolume(cat.volumeBytes)}
                            </span>
                          </button>
                          {open && cat.leaves.length > 0 && (
                            <ul className="border-t border-line bg-surface-alt/20 px-3 py-1">
                              {cat.leaves.map((leaf) => (
                                <li
                                  key={leaf.prefix}
                                  className="flex items-center gap-2 py-1 pl-4 text-[11.5px] text-ink"
                                >
                                  <Folder className="h-3 w-3 text-ink-3" />
                                  <span className="font-mono text-[10.5px] text-ink-3">{leaf.prefix}</span>
                                  <span className="flex-1 truncate">{leaf.name}</span>
                                  <span className="font-mono text-[10.5px] text-ink-3">
                                    {leaf.count} · {formatVolume(leaf.volumeBytes)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Politique d'accès */}
              <section>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Politique d'accès</h3>
                <div className="rounded-lg border border-line p-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10.5px] uppercase tracking-wider text-ink-3">
                      Niveau de confidentialité
                    </span>
                    <select
                      value={confEdit ?? data.space.confidentiality}
                      onChange={(e) => setConfEdit(e.target.value as Confidentiality)}
                      disabled={readOnly}
                      className="h-9 rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400 disabled:opacity-60"
                    >
                      {(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"] as const).map((c) => (
                        <option key={c} value={c}>
                          {CONF_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {submitErr && (
                    <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11.5px] text-rose-700">
                      {submitErr}
                    </div>
                  )}
                  {mut.isSuccess && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11.5px] text-emerald-700">
                      Politique mise à jour. Le responsable a été notifié.
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={readOnly || mut.isPending || confEdit === data.space.confidentiality}
                      onClick={() => {
                        if (!confEdit) return;
                        setSubmitErr(null);
                        mut.mutate(
                          { confidentiality: confEdit },
                          {
                            onError: (e: Error) => setSubmitErr(e.message),
                          },
                        );
                      }}
                      className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {mut.isPending ? "Enregistrement…" : "Appliquer"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>

      {showImport && data?.space && (
        <ImportDocumentModal
          defaultSpaceId={data.space.id}
          defaultSpaceName={data.space.name}
          onClose={() => setShowImport(false)}
          onUploaded={() => {
            /* useUploadDocument invalide automatiquement les queries ged */
          }}
        />
      )}
    </div>
  );
}
