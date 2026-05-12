"use client";

import { useState, useEffect } from "react";
import { Copy, ExternalLink, X, Check, MessageCircle } from "lucide-react";

interface Props {
  open: boolean;
  shareUrl: string | null;
  preview: string | null;
  defaultPhone: string | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (to: string | undefined) => void;
}

/**
 * Modal de confirmation et de preview du partage WhatsApp.
 * 1er passage : saisie/confirmation du numéro destinataire → submit.
 * 2e passage : affiche le lien signé 24 h + texte WhatsApp pré-rendu,
 * bouton copier, bouton "Ouvrir WhatsApp" via wa.me.
 */
export function WhatsAppShareModal({
  open,
  shareUrl,
  preview,
  defaultPhone,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setPhone(defaultPhone ?? "");
    if (!open) setCopied(false);
  }, [open, defaultPhone]);

  if (!open) return null;

  const whatsappWebHref = preview
    ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(preview)}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageCircle className="h-4 w-4 text-green-600" /> Partager le bulletin par WhatsApp
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-4 py-4">
          {!shareUrl && (
            <>
              <label className="block">
                <span className="text-xs text-ink-3">Destinataire (numéro WhatsApp)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 6 78 42 18 56"
                  className="mt-1 block min-h-[48px] w-full rounded-xl border border-line bg-white px-3 text-base text-ink shadow-inner focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="mt-1 block text-[11px] text-ink-3">
                  Le lien créé sera valide 24 h. Tu peux le forwarder ensuite.
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}

              <button
                type="button"
                onClick={() => onSubmit(phone || undefined)}
                disabled={isSubmitting || !phone.trim()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                <MessageCircle className="h-4 w-4" />
                {isSubmitting ? "Préparation…" : "Générer le lien WhatsApp"}
              </button>
            </>
          )}

          {shareUrl && (
            <>
              <div className="rounded-xl border border-line bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wider text-ink-3">Lien sécurisé (24 h)</p>
                <p className="mt-1 break-all text-xs text-ink-2">{shareUrl}</p>
              </div>

              {preview && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-900">
                  <p className="text-[11px] uppercase tracking-wider text-green-700">Message envoyé</p>
                  <p className="mt-1 whitespace-pre-wrap">{preview}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copié" : "Copier"}
                </button>
                {whatsappWebHref && (
                  <a
                    href={whatsappWebHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
