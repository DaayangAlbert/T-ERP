"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function QhseDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Espace du <strong>Responsable QHSE</strong> (Qualité, Hygiène, Sécurité,
        Environnement) : pilotage transverse de la sécurité, des non-conformités et
        de la prévention des risques sur tous les chantiers.
      </p>

      <HelpWarn>
        Le QHSE est la conscience sécurité de l&apos;entreprise. Un AT mortel ou grave
        engage la responsabilité pénale du chef de chantier ET du Responsable QHSE.
        Sois rigoureux sur les remontées et les actions correctives.
      </HelpWarn>

      <HelpSection title="KPIs sécurité">
        <p>
          Incidents 30 j, AT avec arrêt YTD, TF1 (taux de fréquence), TG (taux de
          gravité), jours sans accident, audits HSE réalisés vs prévus.
        </p>
      </HelpSection>

      <HelpSection title="Suivi des incidents">
        <p>
          Liste des incidents remontés depuis les chantiers : presque-accidents, AT
          légers, AT avec arrêt, AT graves, AT mortels. Tri par criticité.
        </p>
      </HelpSection>

      <HelpSection title="Non-conformités (NC)">
        <p>
          NC ouvertes par chantier : qualité, sécurité, environnement. Statut, action
          corrective, responsable, délai. Badge rouge si non close à J+3 (critique) ou
          J+15 (majeure).
        </p>
      </HelpSection>

      <HelpSection title="Audits HSE">
        <HelpSteps>
          <li>Programmation des audits internes (mensuels, trimestriels).</li>
          <li>Conduite de l&apos;audit sur site avec checklist standardisée.</li>
          <li>Constats + actions correctives.</li>
          <li>Suivi de la levée des constats avec relances automatiques.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Rapport mensuel QHSE">
        <p>
          Bouton <strong>« Nouveau rapport QHSE »</strong> chaque mois : sinistralité,
          NC, audits, formations. Soumets au DG avant le 5 du mois suivant.
        </p>
      </HelpSection>

      <HelpTip>
        Une formation sécurité régulière (quart d&apos;heure hebdo) divise par 3 le
        taux d&apos;accidents. Pousse les chefs de chantier à les faire — c&apos;est
        ton meilleur levier de prévention.
      </HelpTip>
    </>
  );
}
