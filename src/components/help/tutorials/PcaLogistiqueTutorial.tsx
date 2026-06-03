"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaLogistiqueTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée <strong>logistique groupe</strong> : flotte, coûts carburant et
        location, taux d&apos;immobilisation.
      </p>

      <HelpSection title="Flotte">
        <p>
          Nombre de véhicules / engins par type, valeur patrimoniale, âge moyen,
          contrôles réglementaires à jour ou non.
        </p>
      </HelpSection>

      <HelpSection title="Coût logistique">
        <p>
          Total dépenses (carburant, location, entretien, transport) en % du CA. Indique
          si la logistique pèse lourdement vs benchmark (typiquement 8-12 % du CA BTP).
        </p>
      </HelpSection>

      <HelpSection title="Renouvellement">
        <p>
          Engins arrivant en fin de durée d&apos;amortissement à renouveler. Décision
          d&apos;investissement à prendre en Conseil.
        </p>
      </HelpSection>

      <HelpTip>
        Une flotte vieillissante (âge moyen &gt; 8 ans) génère des immobilisations, des
        pannes et des sur-coûts. Anticipe le renouvellement.
      </HelpTip>
    </>
  );
}
