"use client";

import { useMemo, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, Camera, ImagePlus, HeartPulse } from "lucide-react";
import type { SickReportPayload } from "@/hooks/useOuvLeaves";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SickReportPayload) => Promise<{ message: string; cnpsNotificationRequired: boolean } | null>;
}

const SICK_CERT_THRESHOLD_DAYS = 3;

// Modal "Signaler maladie" : dates + symptômes optionnels + upload photo
// certificat médical (obligatoire si > 3 jours). Compression auto via canvas.
export function SickLeaveModal({ isOpen, onClose, onSubmit }: Props) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [symptoms, setSymptoms] = useState("");
  const [certDataUrl, setCertDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const days = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0;
    return Math.floor((e.getTime() - s.getTime()) / (24 * 3600 * 1000)) + 1;
  }, [startDate, endDate]);

  const requiresCert = days > SICK_CERT_THRESHOLD_DAYS;

  if (!isOpen) return null;

  function reset() {
    setStartDate(todayIso);
    setEndDate(todayIso);
    setSymptoms("");
    setCertDataUrl(null);
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const original = reader.result as string;
      // Compression simple : redimensionne à 1024x1024 max et qualité 0.75
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
          setCertDataUrl(original);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        setCertDataUrl(canvas.toDataURL("image/webp", 0.75));
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError(null);
    if (days <= 0) {
      setError("Période invalide");
      return;
    }
    if (requiresCert && !certDataUrl) {
      setError(`Photo du certificat médical obligatoire pour un arrêt > ${SICK_CERT_THRESHOLD_DAYS} jours`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit({
        startDate,
        endDate,
        symptoms: symptoms || undefined,
        medicalCert: certDataUrl ?? undefined,
      });
      if (res) setSuccess(res.message);
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
          <div className="flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-rose-600" />
            <h2 className="text-[18px] font-bold text-slate-900">
              {success ? "Signalement enregistré" : "Signaler une maladie"}
            </h2>
          </div>
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
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-rose-600 px-8 text-[15px] font-bold text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                  Du
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                  Au
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
            </div>

            <div className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800">
              {days} jour{days > 1 ? "s" : ""} d'arrêt
              {requiresCert && (
                <span className="ml-1 font-bold">· certificat médical obligatoire</span>
              )}
            </div>

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Symptômes (optionnel)
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Exemple : paludisme, fièvre, problème dos"
              maxLength={500}
              rows={3}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />

            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Certificat médical {requiresCert && <span className="text-rose-600">(obligatoire)</span>}
            </p>
            {certDataUrl ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <img src={certDataUrl} alt="Certificat médical" className="max-h-48 w-full rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={() => setCertDataUrl(null)}
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
                  className="flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
                >
                  <Camera className="h-6 w-6 text-rose-600" />
                  Prendre photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex h-[68px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700"
                >
                  <ImagePlus className="h-6 w-6 text-rose-600" />
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

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer signalement
            </button>
          </>
        )}
      </div>
    </div>
  );
}
