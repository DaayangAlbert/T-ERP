"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  type EpiItem,
  epiEmoji,
  useRequestEpiReplacement,
} from "@/hooks/useOuvEpi";

interface Props {
  items: EpiItem[];
}

// Liste EPI : casque, lunettes, gants, chaussures, gilet. Chip statut.
// Bouton "Demander remplacement" si OK ou WORN_OUT (sinon déjà en cours).
export function EpiList({ items }: Props) {
  const [askingId, setAskingId] = useState<string | null>(null);
  if (items.length === 0) {
    return (
      <section className="mb-3.5 rounded-2xl border border-slate-100 bg-white p-4 text-center">
        <p className="text-[14px] text-slate-500">Aucun EPI assigné</p>
        <p className="mt-1 text-[12px] text-slate-400">Vois avec le magasinier (Lucas)</p>
      </section>
    );
  }

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 mt-1 text-[16px] font-bold text-slate-900">🦺 Mes EPI obligatoires</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {items.map((e, idx) => (
          <Row
            key={e.id}
            epi={e}
            isLast={idx === items.length - 1}
            onAsk={() => setAskingId(e.id)}
          />
        ))}
      </div>

      {askingId && (
        <ReplacementRequestModal
          epi={items.find((e) => e.id === askingId)!}
          onClose={() => setAskingId(null)}
        />
      )}
    </section>
  );
}

function Row({
  epi,
  isLast,
  onAsk,
}: {
  epi: EpiItem;
  isLast: boolean;
  onAsk: () => void;
}) {
  const meta = statusMeta(epi);
  return (
    <div
      className={`flex min-h-[64px] items-center gap-3 px-4 py-3.5 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-amber-50 text-[22px]">
        {epiEmoji(epi.epiType)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">{epi.name}</p>
        <p className="truncate text-[12px] text-slate-500">
          Reçu {formatDate(epi.assignedAt)}
          {epi.isOverdue
            ? " · à remplacer"
            : epi.needsReplacementSoon
              ? " · renouvellement bientôt"
              : ""}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
          {meta.label}
        </span>
        {(epi.status === "OK" || epi.status === "WORN_OUT") && (
          <button
            type="button"
            onClick={onAsk}
            className="text-[11px] font-semibold text-purple-600 hover:underline"
          >
            {epi.status === "WORN_OUT" ? "Voir demande" : "Demander"}
          </button>
        )}
      </div>
    </div>
  );
}

function statusMeta(epi: EpiItem): { label: string; tone: string } {
  if (epi.status === "WORN_OUT") return { label: "⏳ Demande", tone: "bg-amber-50 text-amber-800" };
  if (epi.status === "DEFECTIVE") return { label: "⚠ Défectueux", tone: "bg-rose-50 text-rose-700" };
  if (epi.status === "REPLACED") return { label: "Remplacé", tone: "bg-slate-100 text-slate-600" };
  if (epi.status === "LOST") return { label: "Perdu", tone: "bg-rose-50 text-rose-700" };
  if (epi.isOverdue) return { label: "⚠ Échu", tone: "bg-rose-50 text-rose-700" };
  if (epi.needsReplacementSoon) return { label: "⚠ Bientôt", tone: "bg-amber-50 text-amber-800" };
  return { label: "✓ OK", tone: "bg-emerald-50 text-emerald-700" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function ReplacementRequestModal({
  epi,
  onClose,
}: {
  epi: EpiItem;
  onClose: () => void;
}) {
  const mut = useRequestEpiReplacement();
  const [reason, setReason] = useState(epi.replacementReason ?? "");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 5) {
      setError("Précise la raison (≥ 5 caractères)");
      return;
    }
    setError(null);
    try {
      await mut.mutateAsync({ epiId: epi.id, reason: reason.trim() });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    }
  }

  const isReadOnly = epi.status === "WORN_OUT" && Boolean(epi.replacementReason);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {isReadOnly ? "Demande en cours" : `Remplacer ${epi.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <p className="text-[16px] font-bold text-slate-900">
              ✓ Demande envoyée au magasinier
            </p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              Lucas TIENTCHEU prépare le remplacement.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-purple-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : isReadOnly ? (
          <>
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
              Une demande de remplacement est déjà en cours pour cet EPI.
            </p>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Raison signalée
            </p>
            <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
              {epi.replacementReason}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-[14px] font-bold text-slate-700"
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Raison du remplacement
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Exemple : usé · semelle décollée · taille incorrecte"
              maxLength={300}
              rows={3}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={mut.isPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {mut.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer au magasinier
            </button>
          </>
        )}
      </div>
    </div>
  );
}
