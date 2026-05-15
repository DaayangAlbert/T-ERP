"use client";

import { Eye, AlertCircle } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULE_LABEL, type Module } from "@/lib/rbac/modules";

interface Props {
  module: Module;
  /** Si fourni, force l'affichage même si l'access n'est pas READ (debug). */
  forceShow?: boolean;
}

/**
 * Bandeau discret affiché en haut d'un module quand l'utilisateur a un
 * niveau d'accès READ (drill-down lecture seule) — typiquement le DG qui
 * consulte les espaces DAF/RH/DT sans pouvoir éditer.
 *
 * S'auto-masque pour les niveaux FULL, SCOPE, OWN.
 * Pour les niveaux NONE, le layout aura déjà redirigé l'user.
 *
 * Usage :
 *   <ReadOnlyBanner module={MODULES.DAF} />
 */
export function ReadOnlyBanner({ module, forceShow = false }: Props) {
  const access = useAccess(module);
  if (!forceShow && access.level !== "READ") return null;

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-900">
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span className="font-semibold">Vue lecture seule</span>
      <span className="opacity-75">·</span>
      <span className="opacity-90">
        Tu consultes <strong>{MODULE_LABEL[module]}</strong> sans pouvoir
        modifier. Les actions d'édition sont masquées pour ce profil.
      </span>
    </div>
  );
}

/**
 * Variante compacte (juste l'icône + badge) à utiliser dans une action bar.
 */
export function ReadOnlyChip({ module }: { module: Module }) {
  const access = useAccess(module);
  if (access.level !== "READ") return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"
      title="Vue lecture seule — édition désactivée pour ce profil"
    >
      <AlertCircle className="h-3 w-3" />
      Lecture seule
    </span>
  );
}
