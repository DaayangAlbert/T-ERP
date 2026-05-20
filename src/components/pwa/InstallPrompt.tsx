"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "terp-pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

// Zones métier avec leur propre flux d'installation : on n'affiche pas la
// bannière globale pour éviter le double-prompt.
const ROLE_PWA_AREAS = /\/(ouv|employe|chef-chantier)(\/|$)/;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS se présente comme un Mac avec écran tactile
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Bannière d'installation PWA universelle.
 *  - Android / Chrome / Edge / desktop : capture `beforeinstallprompt` →
 *    installation en un clic via `prompt()`.
 *  - iOS / iPadOS (Safari) : pas d'API d'installation programmatique →
 *    on guide l'utilisateur (Partager → Sur l'écran d'accueil).
 *  - App déjà installée (mode standalone) : rien.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* localStorage indisponible */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS n'émet jamais beforeinstallprompt : on affiche les instructions.
    if (ios) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [ios]);

  const dismiss = () => {
    setVisible(false);
    setIosOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
  };

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferred(null);
      return;
    }
    if (ios) setIosOpen(true);
  };

  // Pas sur les zones métier (flux d'installation dédié), ni si rien à proposer.
  if (ROLE_PWA_AREAS.test(pathname || "")) return null;
  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Installer l'application T-ERP"
        className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:right-4 sm:left-auto sm:justify-end sm:px-0 sm:pb-0"
      >
        <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#2A1B3D] text-white shadow-2xl shadow-black/40 ring-1 ring-black/5 sm:max-w-sm">
          <div className="flex items-start gap-3 p-4">
            <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" width={36} height={36} className="h-9 w-9" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Installer T-ERP</p>
              <p className="mt-0.5 text-xs leading-snug text-white/70">
                Ajoutez l&apos;application à votre écran d&apos;accueil pour un accès rapide,
                plein écran et hors-ligne.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Fermer"
              className="-mr-1 -mt-1 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 border-t border-white/10 p-3">
            <button
              onClick={dismiss}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              className="flex flex-[1.5] items-center justify-center gap-2 rounded-lg bg-[#A855F7] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9333EA]"
            >
              {ios && !deferred ? (
                <Smartphone className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Installer
            </button>
          </div>
        </div>
      </div>

      {iosOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Comment installer sur iPhone ou iPad"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-[#2A1B3D] shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Installer sur votre appareil</h2>
              <button
                onClick={dismiss}
                aria-label="Fermer"
                className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Sur iPhone / iPad, l&apos;installation se fait depuis Safari en deux étapes :
            </p>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#F3E8FF] text-[#A855F7]">
                  <Share className="h-4 w-4" />
                </span>
                <span>
                  Touchez l&apos;icône <strong>Partager</strong> dans la barre de Safari.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-[#F3E8FF] text-[#A855F7]">
                  <Plus className="h-4 w-4" />
                </span>
                <span>
                  Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong>, puis{" "}
                  <strong>Ajouter</strong>.
                </span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-5 w-full rounded-lg bg-[#A855F7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9333EA]"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
