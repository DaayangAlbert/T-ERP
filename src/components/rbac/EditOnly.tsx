"use client";

import { Lock } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { type Module } from "@/lib/rbac/modules";

interface EditOnlyProps {
  module: Module;
  children: React.ReactNode;
  /**
   * Fallback affiché à la place quand l'utilisateur n'a pas le droit d'éditer.
   * Par défaut : rien (les éléments sont totalement masqués).
   */
  fallback?: React.ReactNode;
}

/**
 * Wrapper qui ne rend ses enfants QUE si l'utilisateur connecté peut éditer
 * le module donné. Sinon affiche `fallback` (ou rien).
 *
 * À utiliser pour masquer les boutons "Valider", "Saisir écriture",
 * "Nouveau X", "Supprimer", "Approuver", etc. lorsque l'utilisateur est en
 * mode READ (drill-down DG par exemple).
 *
 *   <EditOnly module={MODULES.DAF}>
 *     <Button onClick={validateInvoice}>Valider la facture</Button>
 *   </EditOnly>
 */
export function EditOnly({ module, children, fallback }: EditOnlyProps) {
  const access = useAccess(module);
  if (!access.canEdit) return fallback ? <>{fallback}</> : null;
  return <>{children}</>;
}

interface ValidateOnlyProps {
  module: Module;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Variante stricte : ne rend les enfants que si l'utilisateur peut VALIDER
 * sur ce module (canValidate === true). Tous les niveaux FULL/SCOPE le
 * permettent ; READ ne le permet pas.
 *
 *   <ValidateOnly module={MODULES.RH}>
 *     <Button onClick={approveLeave}>Approuver le congé</Button>
 *   </ValidateOnly>
 */
export function ValidateOnly({ module, children, fallback }: ValidateOnlyProps) {
  const access = useAccess(module);
  if (!access.canValidate) return fallback ? <>{fallback}</> : null;
  return <>{children}</>;
}

interface ReadOnlyHintProps {
  module: Module;
  message?: string;
}

/**
 * Chip discret affiché en remplacement d'un bouton d'action quand l'user
 * est en mode READ. Utilisé avec `<EditOnly fallback={<ReadOnlyHint .../>}>`.
 *
 *   <EditOnly module={MODULES.DAF} fallback={<ReadOnlyHint module={MODULES.DAF} />}>
 *     <Button>Valider</Button>
 *   </EditOnly>
 */
export function ReadOnlyHint({ module, message }: ReadOnlyHintProps) {
  const access = useAccess(module);
  if (access.canEdit) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200"
      title={`Action en lecture seule pour le rôle courant (${access.level})`}
    >
      <Lock className="h-3 w-3" />
      {message ?? "Action désactivée"}
    </span>
  );
}
