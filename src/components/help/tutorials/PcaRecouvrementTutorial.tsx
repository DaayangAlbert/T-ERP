"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaRecouvrementTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée du <strong>recouvrement clients</strong> : encours, antériorité
        des créances, contentieux.
      </p>

      <HelpSection title="Encours total">
        <p>
          Total des créances clients non encore encaissées. Décomposé par antériorité :
          0-30 j, 31-60 j, 61-90 j, &gt; 90 j.
        </p>
      </HelpSection>

      <HelpSection title="DSO consolidé">
        <p>
          Days Sales Outstanding (délai moyen de paiement client). Indicateur clé du
          BFR : un DSO en hausse = trésorerie qui se dégrade.
        </p>
      </HelpSection>

      <HelpSection title="Top clients à risque">
        <p>
          Liste des clients dont l&apos;encours &gt; 90 j est significatif. Ces clients
          sont à arbitrer (relance ferme, mise en contentieux, suspension de chantier).
        </p>
      </HelpSection>

      <HelpTip>
        Un DSO &gt; 120 j sur un BTP public est normal au Cameroun, mais un encours
        concentré sur 1-2 clients = risque systémique à traiter en Conseil.
      </HelpTip>
    </>
  );
}
