"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgPersonnelTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue stratégique <strong>personnel & coûts</strong> : effectif total, masse salariale,
        évolution, productivité. Indicateurs RH consolidés pour le pilotage DG.
      </p>

      <HelpSection title="Indicateurs clés">
        <ul className="ml-5 list-disc">
          <li><strong>Effectif total</strong> : ventilé par type de contrat, par filiale, par site.</li>
          <li><strong>Masse salariale annuelle</strong> : brut + charges patronales.</li>
          <li><strong>Coût moyen par salarié</strong> : indicateur de productivité.</li>
          <li><strong>Pyramide des âges</strong> : prévisions départs retraite, plan de succession.</li>
          <li><strong>Turnover</strong> : entrées/sorties YTD — signal climat social.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Coût par chantier">
        <p>
          Top des chantiers consommateurs de main d&apos;œuvre. Comparaison avec la marge.
          Identifie les chantiers où le poids salarial dégrade la rentabilité.
        </p>
      </HelpSection>

      <HelpSection title="Alertes RH">
        <p>
          Liste des points de vigilance : turnover anormalement élevé sur un chantier,
          visites médicales en retard, dossiers disciplinaires en cours, contrats CDD
          arrivant à échéance.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle (recrutement, contrats, paie, congés, formations) se fait
        dans l&apos;espace <strong>RH</strong>. Ici c&apos;est ta vue exécutive consolidée.
      </HelpTip>
    </>
  );
}
