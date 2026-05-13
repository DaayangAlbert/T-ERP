"use client";

import { Download, MessageCircle } from "lucide-react";

interface Props {
  payslipId: string;
  verifiedPublicUrl: string | null;
  onShareWhatsapp: () => void;
  isSharing: boolean;
}

/**
 * Boutons d'action sous le détail du bulletin.
 * - Télécharger PDF : <a href> direct vers /api/emp/payslips/:id/pdf
 *   (le navigateur affiche le PDF inline, l'ouvrier peut "Enregistrer sous").
 * - Partager WhatsApp : appelle l'API qui génère un lien signé 24 h
 *   + envoie le template WhatsApp Business. L'ouvrier peut forwarder
 *   le message à sa femme/famille.
 *
 * Touch target ≥ 48 px sur chaque bouton (mobile-first).
 */
export function PayslipActionsRow({ payslipId, verifiedPublicUrl, onShareWhatsapp, isSharing }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <a
        href={verifiedPublicUrl ?? `/api/emp/payslips/${payslipId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-card transition active:scale-[0.99]"
      >
        <Download className="h-4 w-4" />
        Ouvrir le bulletin
      </a>
      <button
        type="button"
        onClick={onShareWhatsapp}
        disabled={isSharing}
        className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {isSharing ? "Préparation…" : "Partager WhatsApp"}
      </button>
    </div>
  );
}
