"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function SgConformiteTutorial() {
  return (
    <>
      <p className="mb-4">
        Pilotage de la <strong>conformité réglementaire</strong> : attestations CNPS,
        DGI, contributions sociales, autorisations diverses.
      </p>

      <HelpSection title="Checklist conformité">
        <p>
          Liste de toutes les conformités à maintenir : attestation CNPS, attestation
          DGI, RCCM, statuts à jour, dépôts annuels OHADA, certifications ISO, etc.
        </p>
      </HelpSection>

      <HelpSection title="État pour chaque conformité">
        <p>
          Pour chaque ligne : statut (à jour, à renouveler, expiré, non applicable),
          date d&apos;échéance, document de référence en PJ.
        </p>
      </HelpSection>

      <HelpSection title="Renouveler une attestation">
        <HelpSteps>
          <li>30-60 j avant expiration, tu reçois une alerte.</li>
          <li>Déclenche la procédure (déclarations, paiements, dossiers à constituer).</li>
          <li>Une fois la nouvelle attestation reçue, upload + mise à jour de la date d&apos;expiration.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Une attestation expirée nous expose à des amendes et à la <strong>solidarité
        fiscale</strong> en cas de marché public (impossible de soumissionner sans
        attestations en règle).
      </HelpWarn>

      <HelpTip>
        Pour les marchés publics, les attestations doivent avoir &lt; 3 mois d&apos;âge.
        Renouvelle systématiquement même si pas encore expirée.
      </HelpTip>
    </>
  );
}
