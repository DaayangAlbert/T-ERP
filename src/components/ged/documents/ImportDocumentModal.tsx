"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Upload, FileText, AlertTriangle, CheckCircle2, Tags, FolderOpen } from "lucide-react";
import { clsx } from "clsx";
import { Confidentiality } from "@prisma/client";
import { useUploadDocument, type UploadDocumentResponse } from "@/hooks/useGedDocuments";

interface Props {
  /** Si fourni, l'upload sera scopé à cet espace (la classif spaceId est forcée). */
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  onClose: () => void;
  onUploaded: (res: UploadDocumentResponse) => void;
}

const CONF_OPTIONS: { id: Confidentiality; label: string; tone: string }[] = [
  { id: "PUBLIC", label: "Public", tone: "border-slate-300 bg-slate-50 text-slate-700" },
  { id: "INTERNAL", label: "Interne", tone: "border-violet-300 bg-violet-50 text-violet-700" },
  { id: "RESTRICTED", label: "Restreint", tone: "border-amber-300 bg-amber-50 text-amber-700" },
  { id: "CONFIDENTIAL", label: "Confidentiel", tone: "border-rose-300 bg-rose-50 text-rose-700" },
];

function fmtSize(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} Mo`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} Ko`;
  return `${b} o`;
}

// Détection client de préfixe (preview UX uniquement — le serveur refait la classif)
function detectPrefix(filename: string): string | null {
  const base = filename.replace(/^.*[\\/]/, "");
  const m = base.match(/^([A-Z][A-Z0-9_]{1,5})[-_]/);
  return m ? m[1] : null;
}

export function ImportDocumentModal({ defaultSpaceId, defaultSpaceName, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [confidentiality, setConfidentiality] = useState<Confidentiality>("INTERNAL");
  const [classificationPrefix, setClassificationPrefix] = useState("");
  const [publish, setPublish] = useState(true);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<UploadDocumentResponse | null>(null);

  const upload = useUploadDocument();

  const detectedPrefix = useMemo(() => (file ? detectPrefix(file.name) : null), [file]);

  useEffect(() => {
    if (file && !displayName) setDisplayName(file.name);
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setSuccess(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setSuccess(null);
    }
  }

  async function submit() {
    if (!file) return;
    try {
      const res = await upload.mutateAsync({
        file,
        displayName: displayName.trim() || undefined,
        spaceId: defaultSpaceId,
        classificationPrefix: classificationPrefix.trim().toUpperCase() || undefined,
        confidentiality,
        publish,
        notes: notes.trim() || undefined,
      });
      setSuccess(res);
      onUploaded(res);
    } catch {
      /* erreur rendue plus bas */
    }
  }

  function reset() {
    setFile(null);
    setDisplayName("");
    setClassificationPrefix("");
    setNotes("");
    setSuccess(null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Importer un document</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">
              Auto-classification par préfixe · rétention IFRS auto-calculée
              {defaultSpaceName && <> · espace : <strong>{defaultSpaceName}</strong></>}
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
          {success ? (
            <SuccessPanel res={success} onAnother={reset} />
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={clsx(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition",
                  file ? "border-violet-300 bg-violet-50" : "border-line bg-surface-alt/30 hover:bg-surface-alt/50",
                )}
              >
                <Upload className="h-8 w-8 text-violet-600" />
                <p className="mt-1 text-[12px] font-semibold text-ink">
                  {file ? file.name : "Glissez-déposez un fichier"}
                </p>
                <p className="text-[10.5px] text-ink-3">
                  PDF, Word, Excel, images · max 50 Mo
                </p>
                <label className="mt-2 cursor-pointer rounded-md bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-violet-700">
                  {file ? "Changer" : "Choisir un fichier"}
                  <input
                    type="file"
                    onChange={onPickFile}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.heic,.txt,.csv,.zip"
                  />
                </label>
                {file && (
                  <p className="mt-1 text-[10.5px] text-ink-3">{fmtSize(file.size)} · {file.type || "type inconnu"}</p>
                )}
              </div>

              {/* Preview auto-classif */}
              {file && (
                <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[11.5px]">
                  <div className="flex items-center gap-1.5 font-semibold text-violet-900">
                    <Tags className="h-3.5 w-3.5" /> Pré-détection
                  </div>
                  {detectedPrefix ? (
                    <p className="mt-0.5 text-violet-900">
                      Préfixe détecté : <strong className="font-mono">{detectedPrefix}</strong> —
                      le serveur cherchera la classification correspondante dans la nomenclature.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-violet-900">
                      Aucun préfixe détecté dans le nom. Vous pouvez forcer un préfixe ci-dessous, ou
                      classer manuellement après import (le document apparaîtra dans « à classer »).
                    </p>
                  )}
                </div>
              )}

              {/* Champs */}
              <div className="space-y-2">
                <Field label="Nom affiché">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nom du document tel qu'affiché"
                    className="h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
                  <Field label="Préfixe forcé" hint="Override auto-détection">
                    <input
                      type="text"
                      value={classificationPrefix}
                      onChange={(e) => setClassificationPrefix(e.target.value.toUpperCase())}
                      placeholder="Ex : PEX"
                      maxLength={6}
                      className="h-8 w-full rounded-md border border-line bg-white px-2 font-mono text-[12px] outline-none focus:border-violet-400"
                    />
                  </Field>
                  <Field label="Confidentialité">
                    <div className="grid grid-cols-4 gap-1">
                      {CONF_OPTIONS.map((o) => {
                        const active = confidentiality === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setConfidentiality(o.id)}
                            className={clsx(
                              "rounded-md border px-1 py-1 text-[10.5px] font-semibold",
                              active ? o.tone : "border-line bg-white text-ink-3 hover:bg-surface-alt",
                            )}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>

                <Field label="Notes d'import (optionnel)">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Contexte, source, mots-clés…"
                    className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                  />
                </Field>

                <label className="flex items-center gap-2 text-[11.5px]">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                  />
                  <span>Publier immédiatement (sinon brouillon)</span>
                </label>
              </div>

              {upload.isError && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {(upload.error as Error)?.message ?? "Erreur d'import"}
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
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
              disabled={!file || upload.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> {upload.isPending ? "Import…" : "Importer"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</label>
      {hint && <p className="text-[10.5px] text-ink-3/80">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SuccessPanel({ res, onAnother }: { res: UploadDocumentResponse; onAnother: () => void }) {
  const c = res.classification;
  const reasonLabel: Record<string, string> = {
    "by-prefix": "Auto-classifié par préfixe",
    "explicit-space": "Rangé dans l'espace demandé",
    "by-category-fallback": "Rangé par catégorie (fallback)",
    "unclassified": "Non classé — à requalifier manuellement",
  };
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">Document importé avec succès</div>
          {res.internalReference && (
            <div className="mt-0.5 font-mono text-[11.5px]">Référence : {res.internalReference}</div>
          )}
        </div>
      </div>
      <dl className="space-y-1.5 rounded-md border border-line bg-white p-3 text-[11.5px]">
        <Row icon={Tags} label="Classification" value={c.classificationName ?? `Aucune (${c.detectedPrefix ?? "préfixe non détecté"})`} />
        <Row icon={FolderOpen} label="Espace" value={c.spaceId ? "Rangé" : "À ranger"} />
        <Row icon={FileText} label="Statut classif" value={reasonLabel[c.reason] ?? c.reason} />
        {res.workflowInstanceId && (
          <Row icon={CheckCircle2} label="Workflow" value="Instancié automatiquement" />
        )}
        <Row icon={FileText} label="Fin de DUA" value={new Date(res.duaEndDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
      </dl>
      <button
        type="button"
        onClick={onAnother}
        className="w-full rounded-md bg-violet-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-violet-700"
      >
        Importer un autre document
      </button>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Tags; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line/50 py-1 last:border-0">
      <span className="inline-flex items-center gap-1 text-ink-3">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
