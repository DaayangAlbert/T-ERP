"use client";

import { useState } from "react";
import { X, CheckCircle2, Trophy, XCircle, StopCircle, Handshake } from "lucide-react";
import { clsx } from "clsx";
import { useCloseLegalCase } from "@/hooks/useSgLegalCases";

interface Props {
  caseId: string;
  currentProvision: number;
  onClose: () => void;
}

type FinalStatus = "SETTLED" | "WON" | "LOST" | "ABANDONED";

const STATUSES: { id: FinalStatus; label: string; icon: typeof Trophy; tone: string; hint: string }[] = [
  { id: "WON", label: "Gagné", icon: Trophy, tone: "border-emerald-500 bg-emerald-50 text-emerald-700", hint: "Reprise provision intégrale" },
  { id: "SETTLED", label: "Transigé (amiable)", icon: Handshake, tone: "border-violet-500 bg-violet-50 text-violet-700", hint: "Accord amiable signé" },
  { id: "LOST", label: "Perdu", icon: XCircle, tone: "border-rose-500 bg-rose-50 text-rose-700", hint: "Provision absorbée" },
  { id: "ABANDONED", label: "Abandonné", icon: StopCircle, tone: "border-slate-400 bg-slate-100 text-slate-700", hint: "Désistement / sans suite" },
];

export function CloseLegalCaseModal({ caseId, currentProvision, onClose }: Props) {
  const close = useCloseLegalCase(caseId);
  const [finalStatus, setFinalStatus] = useState<FinalStatus>("SETTLED");
  const [resolution, setResolution] = useState("");
  const [releaseProvision, setReleaseProvision] = useState(true);

  async function submit() {
    try {
      await close.mutateAsync({
        resolution: resolution.trim(),
        finalStatus,
        finalProvisionRelease: releaseProvision,
      });
      onClose();
    } catch {
      /* error rendered below */
    }
  }

  const valid = resolution.trim().length > 4;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-ink">Clôturer le dossier</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-3">Archivage permanent GED (30 ans)</p>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Issue *</label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {STATUSES.map((s) => {
                const Icon = s.icon;
                const active = finalStatus === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFinalStatus(s.id)}
                    className={clsx(
                      "flex items-start gap-2 rounded-md border px-2.5 py-2 text-left text-[11.5px] transition",
                      active ? s.tone + " font-semibold" : "border-line bg-white text-ink hover:bg-surface-alt",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div>{s.label}</div>
                      <div className="text-[10px] font-normal opacity-80">{s.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Compte rendu / Résolution *</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={5}
              placeholder="Issue détaillée, leçons apprises, impact financier final…"
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
            />
          </div>

          {currentProvision > 0 && (
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px]">
              <input
                type="checkbox"
                checked={releaseProvision}
                onChange={(e) => setReleaseProvision(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-amber-900">
                Reprendre la provision ({currentProvision.toLocaleString("fr-FR")} FCFA) — génère écriture comptable côté DAF.
                {finalStatus === "LOST" && (
                  <span className="mt-1 block text-rose-700">
                    Attention : dossier perdu → la provision est généralement absorbée plutôt que reprise.
                  </span>
                )}
              </span>
            </label>
          )}

          {close.isError && (
            <p className="text-[11.5px] text-rose-600">{(close.error as Error)?.message ?? "Erreur"}</p>
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
            disabled={!valid || close.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Clôturer
          </button>
        </footer>
      </div>
    </div>
  );
}
