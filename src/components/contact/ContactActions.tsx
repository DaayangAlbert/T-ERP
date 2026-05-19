"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSquare, Phone, Video } from "lucide-react";
import { clsx } from "clsx";

/**
 * Boutons d'action de contact uniformes pour T-ERP : remplace les
 * anciens `tel:` et les liens `wa.me` (WhatsApp externe) par des liens
 * internes vers la messagerie de l'application.
 *
 * - "Message" → /[tenant]/messagerie?dm=<userId>  (ouvre/crée la conversation)
 * - "Appel"   → /[tenant]/messagerie?call=<userId> (ouvre + déclenche un appel)
 * - "Vidéo"   → idem mais avec ?call=<userId>&kind=video (à venir)
 *
 * Le composant est compact par défaut (icônes seules). Passer
 * `variant="full"` pour avoir les libellés. Passer `size="lg"` pour
 * agrandir (utile dans les modals).
 */
interface Props {
  userId: string;
  /** Téléphone pour fallback hors-app (toujours `null` en interne). */
  phone?: string | null;
  showVideo?: boolean;
  variant?: "compact" | "full";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ContactActions({
  userId,
  showVideo = false,
  variant = "compact",
  size = "md",
  className,
}: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";
  const base = tenantSlug ? `/${tenantSlug}/messagerie` : "/messagerie";

  const sizeCls = {
    sm: "h-7 px-2 text-[11px]",
    md: "h-8 px-2.5 text-[12px]",
    lg: "h-10 px-3 text-[13px]",
  }[size];
  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" }[size];

  return (
    <div className={clsx("inline-flex items-center gap-1", className)}>
      <Link
        href={`${base}?dm=${encodeURIComponent(userId)}`}
        aria-label="Envoyer un message"
        title="Envoyer un message"
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border border-line bg-white text-ink-2 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 transition",
          sizeCls,
        )}
      >
        <MessageSquare className={iconSize} />
        {variant === "full" && <span>Message</span>}
      </Link>

      <Link
        href={`${base}?call=${encodeURIComponent(userId)}`}
        aria-label="Appeler"
        title="Appeler via la messagerie"
        className={clsx(
          "inline-flex items-center gap-1 rounded-md border border-line bg-white text-ink-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition",
          sizeCls,
        )}
      >
        <Phone className={iconSize} />
        {variant === "full" && <span>Appeler</span>}
      </Link>

      {showVideo && (
        <Link
          href={`${base}?call=${encodeURIComponent(userId)}&kind=video`}
          aria-label="Appel vidéo"
          title="Appel vidéo via la messagerie"
          className={clsx(
            "inline-flex items-center gap-1 rounded-md border border-line bg-white text-ink-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition",
            sizeCls,
          )}
        >
          <Video className={iconSize} />
          {variant === "full" && <span>Vidéo</span>}
        </Link>
      )}
    </div>
  );
}
