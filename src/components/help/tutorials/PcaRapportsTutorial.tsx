"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        Bibliothèque des <strong>rapports stratégiques</strong> destinés au Propriétaire :
        rapport mensuel DG, bilan trimestriel, rapport annuel, rapport spécial CAC.
      </p>

      <HelpSection title="Rapport mensuel DG">
        <p>
          Le DG soumet chaque mois une synthèse exécutive : faits marquants, KPIs,
          alertes, décisions en attente. À lire avant le COMEX.
        </p>
      </HelpSection>

      <HelpSection title="Bilan trimestriel">
        <p>
          Synthèse plus dense : performance trimestrielle, comparaison budget, prévisions
          trimestre suivant. Présenté au Conseil trimestriel.
        </p>
      </HelpSection>

      <HelpSection title="Rapport annuel">
        <p>
          Document à présenter à l&apos;AG annuelle : états financiers OHADA, rapport
          de gestion, rapport CAC, projet d&apos;affectation du résultat.
        </p>
      </HelpSection>

      <HelpSection title="Rapport spécial CAC">
        <p>
          Conventions réglementées (transactions avec parties liées). Obligation
          OHADA — à présenter en AG ordinaire avant approbation des comptes.
        </p>
      </HelpSection>

      <HelpTip>
        Archive systématiquement les rapports validés en GED espace « Gouvernance » —
        ils peuvent t&apos;être demandés en audit fiscal ou en investigation.
      </HelpTip>
    </>
  );
}
