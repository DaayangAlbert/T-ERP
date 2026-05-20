"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PhoneOff } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface Props {
  kind: "audio" | "video";
  /** Identifiant déterministe de la salle (les deux interlocuteurs rejoignent la même). */
  roomName: string;
  /** Nom affiché dans l'appel. */
  displayName: string;
  onHangup: () => void;
}

const JITSI_DOMAIN = "meet.jit.si";
const SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

function loadJitsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.JitsiMeetExternalAPI) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Échec de chargement Jitsi")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Échec de chargement Jitsi"));
    document.body.appendChild(s);
  });
}

/**
 * Appel audio/vidéo réel via Jitsi Meet (meet.jit.si, TURN inclus → marche
 * derrière les NAT mobiles). Les deux interlocuteurs qui ouvrent l'appel sur
 * la même conversation rejoignent la même salle (`roomName`).
 */
export function JitsiCall({ kind, roomName, displayName, onHangup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    loadJitsiScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithVideoMuted: kind === "audio",
            startWithAudioMuted: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
        });
        apiRef.current = api;
        api.addEventListener("videoConferenceLeft", () => onHangup());
        api.addEventListener("readyToClose", () => onHangup());
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!disposed) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
      try {
        apiRef.current?.dispose();
      } catch {
        /* ignore */
      }
      apiRef.current = null;
    };
  }, [roomName, displayName, kind, onHangup]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <span className="text-[12px] font-medium uppercase tracking-widest text-white/70">
          {kind === "video" ? "Appel vidéo" : "Appel audio"}
        </span>
        <button
          type="button"
          onClick={onHangup}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" /> Raccrocher
        </button>
      </div>

      <div className="relative flex-1">
        {loading && !error && (
          <div className="absolute inset-0 grid place-items-center text-white/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Connexion à l&apos;appel…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="max-w-sm rounded-xl bg-white/10 p-5 text-white">
              <p className="text-sm font-semibold">Impossible de démarrer l&apos;appel</p>
              <p className="mt-1 text-[12.5px] text-white/70">{error}</p>
              <button
                type="button"
                onClick={onHangup}
                className="mt-4 rounded-md bg-white/15 px-4 py-2 text-[13px] hover:bg-white/25"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
