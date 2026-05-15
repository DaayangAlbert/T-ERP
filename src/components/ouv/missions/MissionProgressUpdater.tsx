"use client";

import { useRef, useState } from "react";
import { X, Loader2, CheckCircle2, Camera, ImagePlus } from "lucide-react";
import type { MissionItem } from "@/hooks/useOuvMissions";

interface Props {
  isOpen: boolean;
  mission: MissionItem | null;
  onClose: () => void;
  onSubmit: (id: string, percent: number, photo?: string, note?: string) => Promise<{ completedAt: string | null }>;
}

// Drawer "Mettre à jour l'avancement" : slider 0-100 % + photo optionnelle
// + note optionnelle. Si 100 % → clôture automatique côté API.
export function MissionProgressUpdater({ isOpen, mission, onClose, onSubmit }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [percent, setPercent] = useState(mission?.progressPercent ?? 0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ completed: boolean } | null>(null);

  // Sync percent quand on ouvre sur une nouvelle mission
  if (isOpen && mission && percent === 0 && mission.progressPercent !== 0 && !success) {
    setPercent(mission.progressPercent);
  }

  if (!isOpen || !mission) return null;

  function reset() {
    setPercent(0);
    setPhoto(null);
    setNote("");
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPhoto(original);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        setPhoto(canvas.toDataURL("image/webp", 0.75));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!mission) return;
    if (percent < 0 || percent > 100) {
      setError("Pourcentage entre 0 et 100");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await onSubmit(mission.id, percent, photo ?? undefined, note || undefined);
      setSuccess({ completed: res.completedAt != null });
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">
            {success ? (success.completed ? "Mission terminée 🎉" : "Avancement mis à jour") : "Mettre à jour l'avancement"}
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
            <p className="text-[16px] font-bold text-slate-900">
              {success.completed ? "Bravo, mission terminée." : `Avancement enregistré à ${percent} %.`}
            </p>
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
            <p className="mb-2 text-[13px] text-slate-600">
              <strong className="font-bold">{mission.title}</strong>
            </p>

            <div className="mb-4 rounded-2xl border border-purple-100 bg-purple-50 px-4 py-5 text-center">
              <p
                className="text-[40px] font-extrabold text-purple-700"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {percent} %
              </p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="mt-3 w-full accent-purple-600"
              />
              <p className="mt-1 text-[12px] text-purple-700">
                {percent === 100
                  ? "À l'envoi, la mission sera marquée terminée"
                  : `Bouge le curseur pour ajuster · pas de 5 %`}
              </p>
            </div>

            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Photo d'avancement (optionnel)
            </p>
            {photo ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <img src={photo} alt="Avancement" className="max-h-48 w-full rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="mt-2 text-[12px] font-semibold text-rose-600"
                >
                  Retirer
                </button>
              </div>
            ) : (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute("capture", "environment");
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
                >
                  <Camera className="h-5 w-5 text-purple-600" />
                  Caméra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
                >
                  <ImagePlus className="h-5 w-5 text-purple-600" />
                  Galerie
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>
            )}

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={percent === 100 ? "Mot de fin de mission (optionnel)" : "Commentaire sur l'avancement"}
              maxLength={500}
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
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {percent === 100 ? "Envoyer et clôturer" : "Enregistrer l'avancement"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
