"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapport journalier Chef Chantier</strong> : compte-rendu de la journée à
        soumettre au CDT chaque soir.
      </p>

      <HelpSection title="Pré-remplissage">
        <p>
          T-ERP remplit automatiquement : météo, équipe présente, productions saisies,
          livraisons reçues, incidents signalés. Tu n&apos;as plus qu&apos;à enrichir.
        </p>
      </HelpSection>

      <HelpSection title="À compléter manuellement">
        <HelpSteps>
          <li><strong>Faits marquants</strong> : ce qui sort de l&apos;ordinaire.</li>
          <li><strong>Visites</strong> : qui est passé (MOE, CDT, fournisseur, etc.).</li>
          <li><strong>Difficultés rencontrées</strong> : ce qui a freiné, ce qui nous attend demain.</li>
          <li><strong>Décisions terrain</strong> : ce que tu as arbitré seul.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Soumettre">
        <p>
          Bouton <strong>« Soumettre »</strong> avant 18 h. Le CDT valide le lendemain matin.
        </p>
      </HelpSection>

      <HelpTip>
        Un rapport vide ou expéditif n&apos;a aucune valeur. C&apos;est ton aide-mémoire et
        une pièce contractuelle en cas de litige MOA — prends-le au sérieux.
      </HelpTip>
    </>
  );
}
