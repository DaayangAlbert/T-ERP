"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, ChevronLeft, MapPin } from "lucide-react";
import {
  type OuvHseType,
  type OuvHseSeverity,
  type OuvHseReportInput,
  hseTypeLabel,
  hseTypeEmoji,
  defaultSeverityForType,
} from "@/schemas/ouv-hse";
import { useGeolocation } from "@/hooks/useGeolocation";
import { HsePhotoUpload } from "@/components/ouv/hse/HsePhotoUpload";
import { AntiRetaliationNotice } from "@/components/ouv/hse/AntiRetaliationNotice";

interface Props {
  isOpen: boolean;
  type: OuvHseType | null;
  onClose: () => void;
  onSubmit: (
    payload: OuvHseReportInput
  ) => Promise<{ message: string; cnpsDeclarationRequired: boolean } | null>;
}

// Formulaire adaptatif selon type d'incident. Géolocalisation auto au mount,
// upload photos, sévérité ajustable, anti-représailles avec case anonyme.
export function HseReportForm({ isOpen, type, onClose, onSubmit }: Props) {
  const geo = useGeolocation({ enabled: isOpen });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [severity, setSeverity] = useState<OuvHseSeverity>("MEDIUM");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; cnps: boolean } | null>(null);

  // Synchronise la sévérité par défaut quand le type change
  useEffect(() => {
    if (type) setSeverity(defaultSeverityForType(type));
  }, [type]);

  if (!isOpen || !type) return null;

  function reset() {
    setTitle("");
    setDescription("");
    setLocationDetail("");
    setSeverity("MEDIUM");
    setPhotos([]);
    setIsAnonymous(false);
    setSubmitting(false);
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    if (!type) return;
    if (title.trim().length < 5) {
      setError("Titre court requis (≥ 5 caractères)");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description requise (≥ 10 caractères)");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await onSubmit({
        type,
        title: title.trim(),
        description: description.trim(),
        severity,
        geo: geo.position ? { lat: geo.position.lat, lng: geo.position.lng } : null,
        locationDetail: locationDetail.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        isAnonymous,
      });
      if (res) setSuccess({ message: res.message, cnps: res.cnpsDeclarationRequired });
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const isCorporal = type === "CORPORAL_ACCIDENT";

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!success && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  onClose();
                }}
                aria-label="Retour"
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
            )}
            <h2 className="text-[18px] font-bold text-slate-900">
              {success ? "Signalement envoyé" : `${hseTypeEmoji(type)} ${hseTypeLabel(type)}`}
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
            <p className="text-[16px] font-bold text-slate-900">{success.message}</p>
            {success.cnps && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
                ⚠ Déclaration CNPS programmée par la DAF sous 48 h (loi camerounaise)
              </p>
            )}
            {isAnonymous && (
              <p className="mt-2 text-[12px] text-slate-500">
                Ton nom ne sera pas visible côté CC / DTrav.
              </p>
            )}
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
            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Titre court
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder(type)}
              maxLength={200}
              className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Description {isCorporal && <span className="text-rose-600">(blessures + témoins)</span>}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={descPlaceholder(type)}
              maxLength={2000}
              rows={isCorporal ? 5 : 4}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />

            <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Localisation précise (optionnel)
            </label>
            <input
              type="text"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder={locationPlaceholder(type)}
              maxLength={300}
              className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />

            <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-rose-600" />
              {geo.status === "granted" && geo.position
                ? `GPS ✓ ±${geo.position.accuracyM} m`
                : geo.status === "denied"
                  ? "GPS refusé — détail à préciser à la main"
                  : geo.status === "requesting"
                    ? "GPS en cours…"
                    : "GPS indisponible"}
            </div>

            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Sévérité
            </p>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as OuvHseSeverity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`h-12 rounded-lg border-2 text-[12px] font-bold ${
                    severity === s ? severityActive(s) : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {severityLabel(s)}
                </button>
              ))}
            </div>

            <HsePhotoUpload photos={photos} onChange={setPhotos} max={5} />

            <AntiRetaliationNotice
              isAnonymous={isAnonymous}
              onToggleAnonymous={setIsAnonymous}
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
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-[16px] font-bold text-white shadow-lg active:scale-[0.98] disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              Envoyer le signalement
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Routage automatique → DTrav (et CNPS si accident corporel)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function titlePlaceholder(type: OuvHseType): string {
  switch (type) {
    case "CORPORAL_ACCIDENT":
      return "Ex. : chute échafaudage pile P3";
    case "NEAR_MISS":
      return "Ex. : chute fer à béton évitée";
    case "EQUIPMENT_DEFECT":
      return "Ex. : disqueuse plus de protection";
    case "SITE_DANGER":
      return "Ex. : tranchée non balisée";
    case "THEFT_INTRUSION":
      return "Ex. : intrusion nuit zone B";
  }
}

function descPlaceholder(type: OuvHseType): string {
  switch (type) {
    case "CORPORAL_ACCIDENT":
      return "Décris ce qui s'est passé · qui est blessé · témoins présents · heure exacte si possible";
    case "NEAR_MISS":
      return "Décris les circonstances : qui a failli être touché, par quoi, comment ça aurait pu mal tourner";
    case "EQUIPMENT_DEFECT":
      return "Quel matériel · quel défaut constaté · prends une photo si possible";
    case "SITE_DANGER":
      return "Quel danger · où exactement sur le chantier · risque pour qui · prends une photo";
    case "THEFT_INTRUSION":
      return "Quoi a disparu (ou intrusion qui/quand) · témoins · preuves photos si possible";
  }
}

function locationPlaceholder(type: OuvHseType): string {
  switch (type) {
    case "SITE_DANGER":
      return "Pile P3 rive droite, étage 2";
    default:
      return "Ex. : zone B, atelier ferraillage";
  }
}

function severityActive(s: OuvHseSeverity): string {
  if (s === "CRITICAL") return "border-rose-700 bg-rose-700 text-white";
  if (s === "HIGH") return "border-rose-500 bg-rose-50 text-rose-700";
  if (s === "MEDIUM") return "border-amber-500 bg-amber-50 text-amber-700";
  return "border-emerald-500 bg-emerald-50 text-emerald-700";
}

function severityLabel(s: OuvHseSeverity): string {
  if (s === "CRITICAL") return "Critique";
  if (s === "HIGH") return "Élevée";
  if (s === "MEDIUM") return "Moyenne";
  return "Faible";
}
