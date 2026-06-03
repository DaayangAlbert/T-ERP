"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravReportingTutorial() {
  return (
    <>
      <p className="mb-4">
        Indicateurs <strong>analytiques du chantier</strong> sur la période choisie :
        avancement physique, productivité, conso matière, écarts budget.
      </p>

      <HelpSection title="Sélection de période">
        <p>
          En haut : sélecteur mois/trimestre/an. Tous les KPIs et graphiques s&apos;ajustent.
        </p>
      </HelpSection>

      <HelpSection title="Courbe S avancement">
        <p>
          Cumul réalisé vs cumul prévu. Tout décrochage visible immédiatement. Tendance
          extrapolée sur le mois suivant.
        </p>
      </HelpSection>

      <HelpSection title="Productivité équipes">
        <p>
          Pour chaque équipe : rendement (m³/jour, m²/jour) vs ratio de référence du lot.
          Permet d&apos;identifier les équipes en sous-performance.
        </p>
      </HelpSection>

      <HelpSection title="Consommation matière">
        <p>
          Ratio quantité consommée / quantité théorique (au regard de l&apos;avancement
          physique). Détecte les sur-consommations qui peuvent indiquer du gaspillage ou des
          non-conformités.
        </p>
      </HelpSection>

      <HelpTip>
        Exporte un PDF ou Excel via le bouton en haut à droite pour ton reporting au DT
        ou pour préparer la réunion hebdo MOA.
      </HelpTip>
    </>
  );
}
