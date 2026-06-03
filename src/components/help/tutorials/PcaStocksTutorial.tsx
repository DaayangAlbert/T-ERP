"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaStocksTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée des <strong>stocks</strong> du groupe (matériaux, équipements,
        outillage) sur tous les magasins (central + chantiers).
      </p>

      <HelpSection title="Valorisation totale">
        <p>
          Valeur stock total + décomposition par magasin / filiale. Évolution sur 12 mois.
        </p>
      </HelpSection>

      <HelpSection title="Rotation stocks">
        <p>
          Nombre de jours de stock moyen. Un ratio &gt; 90 j = sur-stockage (BFR
          immobilisé), &lt; 30 j = risque rupture chronique.
        </p>
      </HelpSection>

      <HelpSection title="Anomalies">
        <p>
          Articles obsolètes, périmés, valeur immobilisée sans rotation. Sujets à
          investigation comptable / inventaire.
        </p>
      </HelpSection>

      <HelpTip>
        Le stock est de l&apos;argent immobilisé. Un ratio rotation qui se dégrade
        indique soit du sur-achat, soit du vol — sujets à traiter en Conseil.
      </HelpTip>
    </>
  );
}
