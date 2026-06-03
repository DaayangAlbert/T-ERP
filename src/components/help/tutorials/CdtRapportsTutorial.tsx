"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CdtRapportsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapports CDT</strong> : journaliers et hebdomadaires. Pièces de référence
        pour le DTrav et la traçabilité juridique du chantier.
      </p>

      <HelpSection title="Rapport journalier">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau rapport »</strong> → type Journalier.</li>
          <li>T-ERP pré-remplit : météo, équipes, pointages, livraisons, attachements, incidents.</li>
          <li>Tu complètes : faits marquants, visites, décisions terrain.</li>
          <li>Soumets au DTrav avant 18 h.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Rapport hebdomadaire">
        <p>
          Bouton <strong>« Nouveau rapport hebdo »</strong> consolide les 5 journaliers de
          la semaine. Tu y ajoutes l&apos;analyse hebdo : écarts cadence, alerte risques,
          prévisions semaine suivante.
        </p>
      </HelpSection>

      <HelpSection title="Statut & validation">
        <p>
          <strong>Brouillon</strong> : modifiable · <strong>Soumis</strong> : verrouillé en
          attente DTrav · <strong>Validé</strong> : intégré au reporting · <strong>Renvoyé</strong> :
          motif fourni, corrige et resoumets.
        </p>
      </HelpSection>

      <HelpTip>
        Ne saute jamais une journée — un rapport manquant casse la chaîne de validation et
        peut t&apos;être reproché en cas de contentieux MOA.
      </HelpTip>
    </>
  );
}
