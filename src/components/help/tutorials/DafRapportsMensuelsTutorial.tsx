"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DafRapportsMensuelsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapports financiers mensuels DG</strong> : tu rédiges et soumets le rapport
        financier mensuel à la DG pour validation. Document de pilotage stratégique : situation
        cash, marges chantiers, alertes, recommandations.
      </p>

      <HelpSection title="Liste des rapports">
        <p>
          Tableau filtrable par statut : <strong>Brouillon</strong> / <strong>Soumis</strong> /
          <strong> Validé</strong> / <strong>Rejeté</strong>. Pour chaque rapport : période,
          auteur, date de soumission, date de validation/rejet.
        </p>
      </HelpSection>

      <HelpSection title="Créer un nouveau rapport">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau rapport mensuel »</strong>.</li>
          <li>
            Le rapport est <strong>pré-rempli automatiquement</strong> avec les KPI : CA du mois,
            marges chantiers, trésorerie, recouvrement, paie.
          </li>
          <li>
            Complète les <strong>narratifs</strong> : commentaire exécutif, analyses, plan
            d&apos;action, alertes.
          </li>
          <li>Soumets à la DG quand prêt.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Workflow de validation">
        <ol className="ml-5 list-decimal">
          <li><strong>Brouillon</strong> : tu rédiges, tu peux modifier librement.</li>
          <li><strong>Soumis</strong> : le DG est notifié, le rapport est figé.</li>
          <li>Le DG <strong>valide</strong> (signé, archivé) ou <strong>rejette</strong> avec motif (retour brouillon).</li>
        </ol>
      </HelpSection>

      <HelpTip>
        Cible : un rapport mensuel signé par la DG <strong>avant le 10 du mois suivant</strong>.
        Ce calendrier nourrit le rapport au CAC et les revues de gouvernance.
      </HelpTip>
    </>
  );
}
