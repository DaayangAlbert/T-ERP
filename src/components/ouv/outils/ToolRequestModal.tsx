"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useRequestTool } from "@/hooks/useOuvTools";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_TOOLS = [
  { name: "Marteau de coffreur", category: "Coffrage" },
  { name: "Mètre ruban 5 m", category: "Mesure" },
  { name: "Niveau à bulle 60 cm", category: "Niveau" },
  { name: "Cordeau de coffreur", category: "Coffrage" },
  { name: "Scie circulaire", category: "Découpe" },
  { name: "Disqueuse", category: "Découpe" },
  { name: "Perceuse-visseuse", category: "Fixation" },
  { name: "Pince coupante ferraille", category: "Ferraillage" },
];

// Modal "Demander un outil" : liste outils communs ou saisie libre + motif.
export function ToolRequestModal({ isOpen, onClose }: Props) {
  const mut = useRequestTool();
  const [toolName, setToolName] = useState("");
  const [toolCategory, setToolCategory] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  function reset() {
    setToolName("");
    setToolCategory(null);
    setReason("");
    setIsPermanent(false);
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    if (toolName.trim().length < 2) {
      setError("Nom de l'outil requis");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Précise pourquoi (≥ 5 caractères)");
      return;
    }
    setError(null);
    try {
      const res = await mut.mutateAsync({
        toolName: toolName.trim(),
        toolCategory: toolCategory ?? undefined,
        reason: reason.trim(),
        isPermanent,
      });
      setSuccess(res.message);
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {success ? "Demande envoyée" : "🛠 Demander un outil"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (success) reset();
              onClose();
            }}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="text-[16px] font-bold text-slate-900">{success}</p>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-purple-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Outil courant
            </p>
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {COMMON_TOOLS.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setToolName(t.name);
                    setToolCategory(t.category);
                  }}
                  className={`rounded-lg border-2 px-2.5 py-2 text-left text-[12.5px] font-semibold ${
                    toolName === t.name
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Ou saisis le nom
            </label>
            <input
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="Ex : Pince à dénuder, mèche béton 8 mm"
              maxLength={120}
              className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Pourquoi ? (obligatoire)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Exemple : pour les coffrages de la pile P4 cette semaine"
              maxLength={300}
              rows={3}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />

            <label className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 accent-purple-600"
              />
              <span className="text-[13px] font-semibold text-slate-700">
                Affectation permanente (pas à rendre)
              </span>
            </label>

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
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Lucas TIENTCHEU prépare ta demande au magasin
            </p>
          </>
        )}
      </div>
    </div>
  );
}
