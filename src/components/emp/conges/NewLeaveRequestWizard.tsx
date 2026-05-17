"use client";

import { useMemo, useRef, useState } from "react";
import { X, ChevronLeft, CalendarDays, FileUp, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, Trash2, Loader2 } from "lucide-react";
import { useCameroonHolidays, useCreateLeaveRequest, type LeaveBalance } from "@/hooks/useEmpLeaves";
import { countWorkingDays, getCameroonHolidays } from "@/lib/holidays-cameroon";
import { compressImage } from "@/lib/image-compress";

interface Props {
  open: boolean;
  balance: LeaveBalance | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: Array<{
  value: string;
  label: string;
  description: string;
  needsCertificate?: boolean;
}> = [
  {
    value: "PAID_LEAVE",
    label: "Congés payés",
    description: "Décompté sur ton solde annuel (30 j acquis · 5 ans = +1 jour ouvrable)",
  },
  {
    value: "COMPENSATORY",
    label: "Récupération",
    description: "Heures supplémentaires converties en jours de repos",
  },
  {
    value: "SICK",
    label: "Maladie",
    description: "Avec certificat médical obligatoire · jusqu'à 6 mois (CNPS)",
    needsCertificate: true,
  },
  {
    value: "FAMILY",
    label: "Événement familial",
    description: "Mariage, naissance, deuil…",
  },
  {
    value: "UNPAID",
    label: "Sans solde",
    description: "Possible avec accord RH",
  },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Lecture du fichier échouée."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lecture échouée."));
    reader.readAsDataURL(file);
  });
}

/**
 * Wizard 3 étapes pour créer une demande de congé.
 *  - Étape 1 : type de congé (radio cards 68 px).
 *  - Étape 2 : dates, avec compteur live des jours ouvrés (excluant
 *    dimanches + fériés camerounais déclarés pour l'année).
 *  - Étape 3 : justificatif (obligatoire pour maladie).
 *
 * Au submit, appelle POST /api/emp/leaves/requests. En cas de succès,
 * refresh des données + close.
 */
export function NewLeaveRequestWizard({ open, balance, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string>("PAID_LEAVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [justificationDoc, setJustificationDoc] = useState("");
  /** Métadonnées du fichier téléversé (nom, type, tailles avant/après compression). */
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    mime: string;
    sizeKb: number;
    originalSizeKb?: number;
    preview: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedType = TYPES.find((t) => t.value === type);
  const yearForCalc = useMemo(() => {
    if (startDate) return new Date(startDate).getUTCFullYear();
    return new Date().getUTCFullYear();
  }, [startDate]);
  const { data: holidaysData } = useCameroonHolidays(yearForCalc);

  // Calcul live des jours ouvrés (côté client pour feedback immédiat).
  const { workingDays, holidaysInRange } = useMemo(() => {
    if (!startDate || !endDate) return { workingDays: 0, holidaysInRange: [] as { date: string; name: string }[] };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return { workingDays: 0, holidaysInRange: [] };
    }
    const holidaysServer = holidaysData?.holidays ?? getCameroonHolidays(yearForCalc);
    const wd = countWorkingDays(start, end, holidaysServer);
    const inRange = holidaysServer
      .filter((h) => h.date >= startDate && h.date <= endDate)
      .map((h) => ({ date: h.date, name: h.name }));
    return { workingDays: wd, holidaysInRange: inRange };
  }, [startDate, endDate, holidaysData, yearForCalc]);

  const create = useCreateLeaveRequest();

  if (!open) return null;

  function reset() {
    setStep(1);
    setType("PAID_LEAVE");
    setStartDate("");
    setEndDate("");
    setReason("");
    setJustificationDoc("");
    setUploadedFile(null);
    setUploading(false);
    setSubmitError(null);
  }

  /**
   * Téléversement du justificatif depuis l'appareil. Compression auto :
   *  - image (jpeg/png/webp/heic) → canvas resize 1024px max + JPEG 0.85
   *  - PDF → lecture directe en base64, limite 2 Mo (PDF déjà compressés)
   *  - autres (docx, xlsx) → refusé pour V1
   */
  async function handleFileUpload(file: File | null) {
    if (!file) return;
    setSubmitError(null);
    setUploading(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        throw new Error("Format non supporté. Utilise une image (JPEG, PNG) ou un PDF.");
      }
      if (isImage) {
        if (file.size > 15_000_000) {
          throw new Error("Image trop volumineuse (15 Mo max en entrée).");
        }
        const result = await compressImage(file, {
          maxDimension: 1024,
          quality: 0.85,
          outputType: "image/jpeg",
        });
        setJustificationDoc(result.dataUrl);
        setUploadedFile({
          name: file.name,
          mime: "image/jpeg",
          sizeKb: result.compressedSizeKb,
          originalSizeKb: result.originalSizeKb,
          preview: result.dataUrl,
        });
      } else {
        // PDF — pas de compression, limite stricte 2 Mo.
        if (file.size > 2_000_000) {
          throw new Error("PDF trop volumineux (2 Mo max). Compresse-le avant upload.");
        }
        const dataUrl = await readFileAsDataUrl(file);
        setJustificationDoc(dataUrl);
        setUploadedFile({
          name: file.name,
          mime: file.type,
          sizeKb: Math.round(file.size / 1024),
          preview: null,
        });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload échoué.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeUploadedFile() {
    setUploadedFile(null);
    setJustificationDoc("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  function canNextFromStep1(): boolean {
    return Boolean(selectedType);
  }
  function canNextFromStep2(): boolean {
    return Boolean(startDate && endDate && workingDays > 0);
  }
  function canSubmit(): boolean {
    if (selectedType?.needsCertificate && !justificationDoc.trim()) return false;
    if (type === "PAID_LEAVE" && balance && workingDays > balance.paidLeaveRemaining) return false;
    return canNextFromStep2();
  }

  async function submit() {
    setSubmitError(null);
    try {
      await create.mutateAsync({
        type,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        justificationDoc: justificationDoc.trim() || undefined,
      });
      onSuccess();
      close();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-slate-100"
                aria-label="Étape précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-ink">
              Nouvelle demande · Étape {step}/3
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grow overflow-y-auto px-4 py-4">
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-ink-3">Choisis le type de congé</p>
              {TYPES.map((t) => {
                const selected = type === t.value;
                return (
                  <label
                    key={t.value}
                    className={`flex min-h-[68px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      selected
                        ? "border-purple-500 bg-purple-50"
                        : "border-line bg-white hover:border-purple-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={t.value}
                      checked={selected}
                      onChange={() => setType(t.value)}
                      className="mt-1 h-4 w-4 accent-purple-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{t.label}</p>
                      <p className="text-[11px] text-ink-3">{t.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-3">Choisis tes dates</p>
              <label className="block">
                <span className="text-xs text-ink-3">Du</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block min-h-[48px] w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-ink-3">Au</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block min-h-[48px] w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </label>

              {startDate && endDate && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="font-semibold">{workingDays} jour{workingDays > 1 ? "s" : ""} ouvré{workingDays > 1 ? "s" : ""}</span>
                  </div>
                  {holidaysInRange.length > 0 && (
                    <p className="mt-1 text-[11px] text-purple-800">
                      Fériés exclus : {holidaysInRange.map((h) => h.name).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {type === "PAID_LEAVE" && balance && workingDays > balance.paidLeaveRemaining && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  Solde insuffisant : {balance.paidLeaveRemaining} j disponibles, demande de {workingDays} j.
                </p>
              )}

              <label className="block">
                <span className="text-xs text-ink-3">Motif (optionnel)</span>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Court motif pour le validateur…"
                  className="mt-1 block w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-3">
                Justificatif {selectedType?.needsCertificate ? "obligatoire" : "(optionnel)"}
              </p>
              {selectedType?.needsCertificate && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  Un certificat médical signé du médecin du travail est obligatoire
                  pour un congé maladie.
                </p>
              )}

              {/* Upload depuis l'appareil */}
              {!uploadedFile && (
                <>
                  <label
                    className={`flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-white px-4 py-4 text-center transition ${
                      uploading
                        ? "border-purple-300 bg-purple-50/50"
                        : "border-line hover:border-purple-400 hover:bg-purple-50/30"
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                        <span className="text-sm font-medium text-ink">Compression en cours…</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="h-7 w-7 text-purple-600" />
                        <span className="text-sm font-medium text-ink">
                          Téléverser depuis l&apos;appareil
                        </span>
                        <span className="text-[10.5px] text-ink-3">
                          Image (JPEG, PNG, HEIC) ou PDF · les photos sont compressées automatiquement
                        </span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
                    <span className="relative mx-auto block w-fit bg-white px-2 text-[10.5px] uppercase tracking-wider text-ink-3">
                      ou
                    </span>
                  </div>

                  <label className="block">
                    <span className="text-xs text-ink-3">URL ou référence GED</span>
                    <input
                      type="text"
                      value={justificationDoc.startsWith("data:") ? "" : justificationDoc}
                      onChange={(e) => setJustificationDoc(e.target.value)}
                      placeholder="https://… ou référence GED"
                      className="mt-1 block min-h-[48px] w-full rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </label>
                </>
              )}

              {/* Preview du fichier téléversé */}
              {uploadedFile && (
                <div className="rounded-xl border border-purple-300 bg-purple-50/40 p-3">
                  <div className="flex items-start gap-3">
                    {uploadedFile.mime.startsWith("image/") && uploadedFile.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadedFile.preview}
                        alt="Aperçu"
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover ring-1 ring-purple-300"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100">
                        <FileText className="h-7 w-7 text-rose-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {uploadedFile.name}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {uploadedFile.mime.startsWith("image/") ? "Image" : "PDF"} ·{" "}
                        {uploadedFile.sizeKb} ko
                        {uploadedFile.originalSizeKb &&
                          uploadedFile.originalSizeKb !== uploadedFile.sizeKb && (
                            <>
                              {" "}
                              <span className="text-emerald-700">
                                (compressé depuis {uploadedFile.originalSizeKb} ko ·
                                réduction de{" "}
                                {Math.round(
                                  100 -
                                    (uploadedFile.sizeKb * 100) /
                                      uploadedFile.originalSizeKb,
                                )}{" "}
                                %)
                              </span>
                            </>
                          )}
                      </p>
                      <button
                        type="button"
                        onClick={removeUploadedFile}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" /> Retirer ce fichier
                      </button>
                    </div>
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-ink-2">
                <ImageIcon className="h-4 w-4 shrink-0 text-ink-3" />
                <span>
                  Conseil : photographie ton justificatif directement avec l&apos;appareil
                  photo de ton téléphone. T-ERP réduit automatiquement la taille pour un
                  envoi rapide même en 3G.
                </span>
              </div>
              {submitError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-line bg-white px-4 py-3">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canNextFromStep1() : !canNextFromStep2()}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              Étape suivante
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit() || create.isPending}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {create.isPending ? "Envoi…" : "Envoyer la demande"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
