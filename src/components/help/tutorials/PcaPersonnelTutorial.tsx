"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaPersonnelTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée du <strong>personnel groupe</strong> : effectif, pyramide,
        masse salariale, mouvements (entrées/sorties), absentéisme.
      </p>

      <HelpSection title="Effectif total">
        <p>
          Décomposition par filiale, par métier, par type de contrat (CDI, CDD, intérim,
          sous-traitant). Évolution sur 12 mois.
        </p>
      </HelpSection>

      <HelpSection title="Masse salariale">
        <p>
          Total annuel + ratio masse salariale / CA (indicateur clé du BTP). Comparaison
          vs benchmark sectoriel.
        </p>
      </HelpSection>

      <HelpSection title="Mouvements">
        <p>
          Entrées (recrutements) et sorties (démissions, licenciements, retraites) sur la
          période. Taux de turnover par filiale et par métier.
        </p>
      </HelpSection>

      <HelpSection title="Absentéisme">
        <p>
          Taux d&apos;absentéisme, AT, jours d&apos;arrêt. Comparé à la moyenne sectorielle
          BTP Cameroun.
        </p>
      </HelpSection>

      <HelpTip>
        Un turnover &gt; 25 % annuel sur un métier clé = alerte. Un absentéisme &gt; 8 %
        = problème de management. Évoque-le en Conseil avec les DRH des filiales.
      </HelpTip>
    </>
  );
}
