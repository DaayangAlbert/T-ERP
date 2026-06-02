"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function RhDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Page d&apos;accueil de l&apos;espace RH. Tu y vois les <strong>KPI du personnel</strong>,
        les <strong>alertes</strong> (visites médicales échues, contrats CDD à renouveler…) et
        les <strong>priorités du jour</strong>.
      </p>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>Effectif total</strong> : actifs + en CDD/CDI/Stage/Intérim.</li>
          <li><strong>Embauches du mois</strong> : nouvelles entrées.</li>
          <li><strong>Sorties du mois</strong> : départs (démission, fin CDD, licenciement…).</li>
          <li><strong>Masse salariale</strong> : enveloppe mensuelle brute.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Alertes et échéances">
        <p>
          Liste des points qui réclament ton attention : visites médicales à programmer, contrats
          CDD qui arrivent à terme, formations CACES à recycler, dossiers disciplinaires à
          traiter. Clique sur une alerte pour aller à la page concernée.
        </p>
      </HelpSection>

      <HelpSection title="Répartition de l'effectif">
        <p>
          Graphique par <strong>département</strong>, <strong>type de contrat</strong> et
          <strong> tranche d&apos;âge</strong>. Pratique pour les bilans sociaux et les revues
          stratégiques avec la DG.
        </p>
      </HelpSection>

      <HelpTip>
        Toutes les actions (création contrat, saisie paie, etc.) se font sur les pages dédiées de
        la sidebar. Ici tu consultes.
      </HelpTip>
    </>
  );
}
