"use client";

import { ShieldCheck } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { QhseWorkspace } from "@/components/qhse/QhseWorkspace";

/**
 * Page QHSE de la Direction Technique.
 *
 * Depuis l'arrivée du rôle Responsable QHSE (QHSE_MANAGER, mai 2026), le DT
 * passe en LECTURE seule sur QHSE : il consulte le même tableau de bord mais
 * ne crée plus de non-conformité (boutons masqués par `canEdit=false`). La
 * gestion opérationnelle se fait dans /responsable-qhse.
 */
export default function DtQhsePage() {
  const canEdit = useAccess(MODULES.QHSE).canEdit;
  const banner = canEdit ? null : (
    <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[12px] text-primary-800">
      <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
      La gestion QHSE est assurée par le <strong>Responsable QHSE</strong>. Cette vue est en lecture seule pour la Direction Technique.
    </div>
  );
  return (
    <QhseWorkspace
      title="Qualité, Hygiène, Sécurité, Environnement"
      subtitle="Vue Direction Technique — pilotage QHSE des chantiers."
      canEdit={canEdit}
      readOnlyBanner={banner}
    />
  );
}
