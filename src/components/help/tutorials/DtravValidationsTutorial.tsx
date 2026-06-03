"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        File des décisions <strong>N1 Directeur Travaux</strong> : congés équipe chantier,
        dépenses petite caisse, demandes appros urgents, attachements signés MOE.
      </p>

      <HelpSection title="Lire un dossier">
        <p>
          Objet · demandeur · montant ou impact · pièces jointes (PDF, photos). Le bandeau
          coloré indique l&apos;urgence (rouge = action attendue dans la journée).
        </p>
      </HelpSection>

      <HelpSection title="Approuver ou refuser">
        <HelpSteps>
          <li>Bouton <strong>« Approuver »</strong> : le dossier remonte au N2 ou se finalise selon le circuit.</li>
          <li>Bouton <strong>« Refuser »</strong> : motif obligatoire (renvoyé au demandeur).</li>
          <li><strong>« Demander précisions »</strong> : pause le dossier en attente du complément.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Approbation en masse">
        <p>
          Coche plusieurs lignes du même type (ex. plusieurs petits achats) → bouton
          <strong> « Approuver la sélection »</strong>. Pratique en fin de journée.
        </p>
      </HelpSection>

      <HelpTip>
        Un congé que tu approuves est immédiatement décompté du solde et visible par le DT.
        Ne JAMAIS approuver pendant un pic chantier sans avoir vérifié la couverture équipe.
      </HelpTip>
    </>
  );
}
