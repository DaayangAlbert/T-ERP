"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ShieldCheck, AlertTriangle, Loader2, PenLine } from "lucide-react";

interface Props {
  open: boolean;
  /** Titre de la modale (ex: "Valider et signer le rapport"). */
  title: string;
  /** Phrase explicative sous le titre. */
  description?: string;
  /** Slug du tenant — pour le lien vers /profil si pas de signature. */
  tenantSlug: string;
  /** true pendant l'appel de validation (spinner sur le bouton). */
  busy?: boolean;
  /** Texte du bouton de confirmation. Défaut: "Confirmer et signer". */
  confirmLabel?: string;
  /** Appelé quand l'utilisateur confirme (déclenche la validation côté parent). */
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modale réutilisable de confirmation de signature avant validation d'un
 * document (rapport, état de paie, etc.).
 *
 * - Charge la signature de l'utilisateur (/api/users/me/signature).
 * - Si présente : affiche un aperçu + bouton "Confirmer et signer".
 * - Si absente : message d'avertissement + lien vers /{slug}/profil pour
 *   en uploader une. La confirmation reste possible (la validation se fera
 *   sans signature visuelle), mais on prévient l'utilisateur.
 *
 * Le document signé portera la signature du valideur (résolue via
 * validatedById côté PDF) + le cachet de la société.
 */
export function SignatureConfirmModal({
  open,
  title,
  description,
  tenantSlug,
  busy,
  confirmLabel = "Confirmer et signer",
  onConfirm,
  onClose,
}: Props) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/users/me/signature", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { signatureUrl: null }))
      .then((d) => setSignatureUrl(d.signatureUrl ?? null))
      .catch(() => setSignatureUrl(null))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasSig = Boolean(signatureUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-10 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)" }}
        >
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {description && <p className="text-[13px] text-ink-2">{description}</p>}

          {loading ? (
            <div className="h-28 animate-pulse rounded-lg bg-surface-alt" />
          ) : hasSig ? (
            <div className="rounded-lg border border-line bg-white p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-success">
                <ShieldCheck className="h-3.5 w-3.5" /> Votre signature sera apposée
              </div>
              <div
                className="grid h-24 place-items-center rounded-md border border-line"
                style={{
                  backgroundColor: "#fff",
                  backgroundImage:
                    "linear-gradient(45deg,#eef0f2 25%,transparent 25%),linear-gradient(-45deg,#eef0f2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef0f2 75%),linear-gradient(-45deg,transparent 75%,#eef0f2 75%)",
                  backgroundSize: "14px 14px",
                  backgroundPosition: "0 0,0 7px,7px -7px,-7px 0",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureUrl!} alt="Votre signature" className="max-h-20 object-contain" />
              </div>
              <p className="mt-2 text-[11px] text-ink-3">
                Le document portera cette signature + le cachet de la société + votre nom.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-800">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Aucune signature enregistrée
              </div>
              <p>
                Vous pouvez valider quand même, mais le document ne portera pas votre
                signature manuscrite (seuls le cachet et votre nom apparaîtront).
              </p>
              <Link
                href={`/${tenantSlug}/profil`}
                className="mt-2 inline-block font-medium text-primary-700 underline hover:text-primary-800"
              >
                Uploader ma signature d&apos;abord →
              </Link>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-line-2 bg-white px-4 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {busy ? "Signature…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
