"use client";

import { useState } from "react";
import { X, RefreshCw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { ApprovalItem } from "@/hooks/useSgInstitutions";
import { useStartApprovalRenewal } from "@/hooks/useSgInstitutions";

interface Props {
  approval: ApprovalItem;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

const REQUIRED_DOCS = [
  "Attestations financières (DGI, CNPS)",
  "Références techniques 3 derniers chantiers",
  "Agréments en cours (copie)",
  "CV cadres techniques certifiés",
  "Statuts à jour + extrait RCCM",
  "Liste matériel technique",
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ApprovalRenewalWizard({ approval, onClose, onSuccess }: Props) {
  const start = useStartApprovalRenewal(approval.id);
  const [step, setStep] = useState<Step>(1);

  // Default new expiry = today + 3 years
  const defaultNewExpiry = new Date(Date.now() + 3 * 365 * 86_400_000).toISOString().slice(0, 10);
  const [newExpiry, setNewExpiry] = useState(defaultNewExpiry);
  const [newNumber, setNewNumber] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  function toggleDoc(d: string) {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  async function submit() {
    try {
      await start.mutateAsync({
        newExpiresAt: new Date(newExpiry).toISOString(),
        newApprovalNumber: newNumber.trim() || undefined,
        documentUrl: docUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const step1Valid = Boolean(newExpiry) && new Date(newExpiry).getTime() > Date.now();
  const step2Valid = checkedDocs.size === REQUIRED_DOCS.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-start justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-ink">Renouvellement agrément</h2>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
              {approval.approvalName} · expire {fmtDate(approval.expiresAt)}
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

        <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-line bg-surface-alt/30 px-3 py-2">
          {["Dates", "Pièces", "Soumission"].map((label, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex flex-col items-center">
                <div
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-bold",
                    done ? "bg-emerald-600 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </div>
                <div className={clsx("mt-0.5 text-[10.5px]", active ? "font-semibold text-violet-700" : done ? "text-emerald-700" : "text-ink-3")}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {step === 1 && (
            <>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Nouveau N° d'agrément</label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder={`Ex : ${approval.approvalNumber.replace(/\d{4}/, new Date().getFullYear().toString())}`}
                  className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
                <p className="mt-0.5 text-[10.5px] text-ink-3">Laisser vide pour conserver l'actuel</p>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Nouvelle date d'expiration *</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  Standard agrément BTP : 2-3 ans · MINTP/MINEE/MINEDUB délivre selon dossier
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-[11.5px] text-violet-900">
                Pièces requises pour le dossier de renouvellement. Cochez chaque pièce une fois préparée et archivée en GED.
              </p>
              <ul className="space-y-1.5">
                {REQUIRED_DOCS.map((d) => {
                  const checked = checkedDocs.has(d);
                  return (
                    <li key={d}>
                      <label
                        className={clsx(
                          "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-[12px]",
                          checked ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-line bg-white text-ink hover:bg-surface-alt",
                        )}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleDoc(d)} className="mt-0.5" />
                        <span className="flex-1">{d}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10.5px] text-ink-3">
                Progression : {checkedDocs.size}/{REQUIRED_DOCS.length}
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">URL dossier complet (GED)</label>
                <input
                  type="url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://ged.terp.cm/agrements/renouvellement-2026-04.zip"
                  className="mt-1 h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Notes (escalade DG si nécessaire)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contexte, contacts ministère, échéances limites…"
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                />
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-900">
                À la soumission : statut → <strong>RENEWED</strong>, nouvelle date {fmtDate(new Date(newExpiry).toISOString())}, trace
                AuditLog conservée 30 ans.
              </div>
            </>
          )}

          {start.isError && (
            <p className="text-[11.5px] text-rose-600">{(start.error as Error)?.message ?? "Erreur"}</p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-alt/40 px-4 py-2.5">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : onClose())}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {step > 1 ? "Précédent" : "Annuler"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Suivant <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={start.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Soumettre le dossier
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
