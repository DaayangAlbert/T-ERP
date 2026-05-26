"use client";

import { useAccess } from "@/hooks/useAccess";
import { MODULES } from "@/lib/rbac/modules";
import { QhseWorkspace } from "@/components/qhse/QhseWorkspace";

/**
 * Espace principal du Responsable QHSE (FULL sur QHSE).
 * Mêmes onglets que la vue DT mais avec création/édition activées.
 */
export default function ResponsableQhsePage() {
  const canEdit = useAccess(MODULES.QHSE).canEdit;
  return (
    <QhseWorkspace
      title="Espace Responsable QHSE"
      subtitle="Pilotage opérationnel QHSE — incidents, non-conformités, audits, certifications."
      canEdit={canEdit}
    />
  );
}
