"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  kind: "audio" | "video";
  contactName: string;
  contactInitials: string;
  contactColor: string;
  onHangup: () => void;
}

/**
 * Modal de simulation d'appel audio/vidéo.
 *
 * Stub UI uniquement — aucune vraie connexion WebRTC. L'objectif est de fournir
 * l'expérience visuelle (timer, contrôles, état "connecté") pour démo et
 * iconographie. Le branchement réel se fera plus tard (Jitsi/Daily.co/Twilio).
 *
 * Comportement :
 *   1. Phase "Sonnerie…" pendant 1.5s
 *   2. Phase "Connecté" avec timer qui monte
 *   3. Boutons : Mute (audio), Caméra on/off (vidéo), Raccrocher
 */
export function CallSimulator({ kind, contactName, contactInitials, contactColor, onHangup }: Props) {
  const [connected, setConnected] = useState(false);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(kind === "video");

  // Phase 1 : sonnerie → connecté après 1.5s
  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Phase 2 : timer qui monte
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [connected]);

  // Échap pour raccrocher
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onHangup();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onHangup]);

  const duration = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950 px-6 py-10 text-white"
      role="dialog"
      aria-label={`Appel ${kind === "video" ? "vidéo" : "audio"} avec ${contactName}`}
    >
      {/* Top bar : état */}
      <div className="text-center">
        <div className="text-[12px] font-medium uppercase tracking-widest text-white/60">
          {connected ? (kind === "video" ? "Appel vidéo" : "Appel audio") : "Sonnerie…"}
        </div>
        <div className="mt-1 text-[11px] text-white/40">Mode démo · pas de connexion réelle</div>
      </div>

      {/* Centre : avatar + nom + timer */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div
            className={clsx(
              "grid h-40 w-40 place-items-center rounded-full text-5xl font-bold shadow-2xl ring-4 ring-white/10",
              !connected && "animate-pulse"
            )}
            style={{ background: contactColor }}
          >
            {contactInitials}
          </div>
          {kind === "video" && !camOn && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-slate-800/80">
              <VideoOff className="h-12 w-12 text-white/70" />
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{contactName}</h2>
          <p className="mt-1.5 font-mono text-[14px] tabular-nums text-white/70">
            {connected ? duration : "…"}
          </p>
        </div>
      </div>

      {/* Bas : contrôles */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Réactiver le micro" : "Couper le micro"}
          className={clsx(
            "grid h-14 w-14 place-items-center rounded-full transition",
            muted ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
          )}
          title={muted ? "Micro coupé" : "Micro actif"}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {kind === "video" && (
          <button
            type="button"
            onClick={() => setCamOn((v) => !v)}
            aria-label={camOn ? "Couper la caméra" : "Activer la caméra"}
            className={clsx(
              "grid h-14 w-14 place-items-center rounded-full transition",
              !camOn ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
            )}
            title={camOn ? "Caméra active" : "Caméra coupée"}
          >
            {camOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </button>
        )}

        <button
          type="button"
          onClick={onHangup}
          aria-label="Raccrocher"
          className="grid h-14 w-20 place-items-center rounded-full bg-rose-600 text-white shadow-lg transition hover:bg-rose-700"
          title="Raccrocher (Échap)"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
