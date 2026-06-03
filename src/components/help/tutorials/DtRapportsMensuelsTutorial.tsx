"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtRapportsMensuelsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapports mensuels techniques</strong> destinés au DG. Tu rédiges la synthèse
        du mois (portefeuille, production, points durs, plan d&apos;action), soumets au DG
        qui signe en N3 pour transmission au CA.
      </p>

      <HelpSection title="Sections d'un rapport mensuel DT">
        <ul className="ml-5 list-disc">
          <li><strong>Synthèse exécutive</strong> : 5 lignes pour le DG.</li>
          <li><strong>État du portefeuille</strong> : nb chantiers, CA cumulé, avancement moyen.</li>
          <li><strong>Production du mois</strong> : volumes posés, jalons atteints.</li>
          <li><strong>Points durs</strong> : retards, dérives marges, conflits ST.</li>
          <li><strong>Pipeline d&apos;études</strong> : AO en cours, taux de succès.</li>
          <li><strong>Plan d&apos;action</strong> : 3-5 actions concrètes pour le mois suivant.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Workflow">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau rapport mensuel »</strong>.</li>
          <li>Sections pré-remplies à partir des données opérationnelles. Tu complètes les narratifs.</li>
          <li><strong>Soumettre au DG</strong> quand prêt.</li>
          <li>DG valide → archivage + envoi au PCA et au CA.</li>
        </HelpSteps>
      </HelpSection>

      <HelpTip>
        Cible : rapport signé DG <strong>avant le 10 du mois suivant</strong>. Au-delà, ça
        décale toute la chaîne CA / CAC.
      </HelpTip>
    </>
  );
}
