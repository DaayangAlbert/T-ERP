"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord du <strong>Directeur Technique</strong> : vue stratégique du
        portefeuille de chantiers, pipeline d&apos;études, charge équipes, alertes QHSE et
        validations marchés en attente.
      </p>

      <HelpSection title="KPI techniques">
        <ul className="ml-5 list-disc">
          <li><strong>Chantiers actifs</strong> : nombre + montant cumulé du portefeuille.</li>
          <li><strong>Études en cours</strong> : AO en analyse + offres en soumission.</li>
          <li><strong>Charge équipes</strong> : taux d&apos;occupation des conducteurs et chefs de chantier.</li>
          <li><strong>QHSE</strong> : TF1, jours sans accident grave, NC ouvertes.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Alertes prioritaires">
        <p>
          Liste rouge/orange : retards chantier, marchés à valider, sous-traitants en
          défaillance, certifications ISO à renouveler, incidents QHSE critiques.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est <strong>en lecture seule</strong>. Tu pilotes ; les actions
        techniques se font sur les pages spécialisées (Portefeuille, Études, Validations…).
      </HelpTip>
    </>
  );
}
