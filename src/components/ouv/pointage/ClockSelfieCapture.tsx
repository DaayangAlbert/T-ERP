"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, RefreshCw, Check } from "lucide-react";

// Capture selfie via HTML5 getUserMedia. Caméra frontale (facingMode: "user"),
// résolution cible 800x600 (équilibre qualité/poids ~80-150 ko en webp 0.7).
// L'image est encodée en dataURL webp et renvoyée au parent.
//
// Étapes :
//   1. Demande permission caméra
//   2. Affiche aperçu live (video element)
//   3. Compte à rebours 3s (laisse l'ouvrier se positionner)
//   4. Capture frame → canvas → toDataURL("image/webp", 0.7)
//   5. Renvoie le dataURL au parent via onCapture()
//
// Si la caméra est inaccessible (perm refusée), on permet quand même de
// poursuivre sans selfie (selon décision client : selfie obligatoire mais
// pas un blocage dur côté UI — sera flagué côté CC).

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;
const COUNTDOWN_S = 3;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string | null) => void;
  // Si true, le bouton "Continuer sans selfie" est masqué (sortie impossible)
  required?: boolean;
}

export function ClockSelfieCapture({ isOpen, onClose, onCapture, required = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<"requesting" | "ready" | "countdown" | "review" | "denied" | "error">("requesting");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);

  // Démarre / arrête le stream selon ouverture
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setStage("requesting");
      setPreview(null);
      setError(null);
      return;
    }
    void startCamera();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Compte à rebours puis capture
  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown <= 0) {
      capture();
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, countdown]);

  async function startCamera() {
    setStage("requesting");
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStage("error");
        setError("Caméra non supportée par ce navigateur");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: TARGET_WIDTH }, height: { ideal: TARGET_HEIGHT } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStage("ready");
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setStage("denied");
        setError("Caméra refusée — autorise dans les paramètres pour pointer");
      } else {
        setStage("error");
        setError(err?.message ?? "Impossible d'accéder à la caméra");
      }
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function capture() {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Préserve le ratio en cropant center-cover
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
    const srcRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (srcRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    const dataUrl = canvas.toDataURL("image/webp", 0.7);
    setPreview(dataUrl);
    setStage("review");
    stopStream();
  }

  function confirm() {
    if (preview) onCapture(preview);
    onClose();
  }

  function retake() {
    setPreview(null);
    setCountdown(COUNTDOWN_S);
    void startCamera();
  }

  function skip() {
    onCapture(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 text-white">
        <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <p className="text-[14px] font-semibold">Selfie de pointage</p>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {stage === "review" && preview ? (
          <img src={preview} alt="Selfie de pointage" className="h-full w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            // Effet miroir : plus naturel pour un selfie
            className="h-full w-full -scale-x-100 object-cover"
          />
        )}

        {stage === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[120px] font-extrabold text-white drop-shadow-lg">{countdown}</span>
          </div>
        )}

        {(stage === "denied" || stage === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
            <Camera className="h-14 w-14 opacity-60" />
            <p className="text-[16px] font-semibold">{error}</p>
            {!required && (
              <button
                type="button"
                onClick={skip}
                className="mt-2 h-12 rounded-lg border border-white/30 px-5 text-[14px] font-semibold"
              >
                Pointer sans selfie
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-around bg-black px-6 py-5">
        {stage === "ready" && (
          <button
            type="button"
            onClick={() => {
              setCountdown(COUNTDOWN_S);
              setStage("countdown");
            }}
            className="grid h-[72px] w-[72px] place-items-center rounded-full border-[4px] border-white bg-white"
            aria-label="Prendre le selfie"
          >
            <span className="block h-[58px] w-[58px] rounded-full bg-rose-500" />
          </button>
        )}
        {stage === "review" && (
          <div className="flex w-full items-center justify-around">
            <button
              type="button"
              onClick={retake}
              className="flex h-12 items-center gap-2 rounded-lg border border-white/40 px-4 text-[14px] font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Reprendre
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex h-12 items-center gap-2 rounded-lg bg-emerald-500 px-6 text-[15px] font-bold text-white"
            >
              <Check className="h-5 w-5" />
              Valider
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
