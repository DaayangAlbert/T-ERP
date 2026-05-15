"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Lock } from "lucide-react";
import { clsx } from "clsx";
import { useAccess } from "@/hooks/useAccess";
import { type Module } from "@/lib/rbac/modules";

interface RbacButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Module dont l'utilisateur doit pouvoir éditer/valider. */
  module: Module;
  /**
   * Niveau requis. "edit" (par défaut) = canEdit ; "validate" = canValidate.
   * Toute valeur false → bouton désactivé avec icône cadenas et tooltip.
   */
  require?: "edit" | "validate";
  /** Message tooltip affiché quand l'action est désactivée. */
  disabledHint?: string;
}

/**
 * Bouton qui se désactive automatiquement selon le niveau d'accès matrice.
 *
 *   <RbacButton module={MODULES.DAF} onClick={save} className="btn-primary">
 *     Sauvegarder
 *   </RbacButton>
 *
 * Un DG en drill-down sur DAF verra le bouton désactivé avec un cadenas
 * (au lieu d'être masqué — utile quand on veut signaler visuellement que
 * l'action existe mais n'est pas accessible).
 *
 * Pour masquer complètement, utiliser <EditOnly> à la place.
 */
export const RbacButton = forwardRef<HTMLButtonElement, RbacButtonProps>(
  ({ module, require = "edit", disabledHint, children, disabled, className, ...rest }, ref) => {
    const access = useAccess(module);
    const allowed = require === "edit" ? access.canEdit : access.canValidate;
    const isDisabled = disabled || !allowed;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        title={!allowed ? (disabledHint ?? "Action en lecture seule pour ce profil") : rest.title}
        className={clsx(
          className,
          !allowed && "cursor-not-allowed opacity-60",
        )}
        {...rest}
      >
        {!allowed && <Lock className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />}
        {children}
      </button>
    );
  }
);

RbacButton.displayName = "RbacButton";
