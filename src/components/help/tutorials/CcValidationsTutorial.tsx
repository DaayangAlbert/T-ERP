"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        File des <strong>dossiers à approuver</strong> au niveau Chef Chantier : sorties
        magasin de ton équipe, petites demandes ouvriers, congés.
      </p>

      <HelpSection title="Approuver">
        <HelpSteps>
          <li>Tape un dossier en attente.</li>
          <li>Vérifie : demandeur, objet, justificatif.</li>
          <li><strong>« Approuver »</strong> ou <strong>« Refuser »</strong> + motif si refus.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Délégation">
        <p>
          Quand tu pars en congé, délègue ta validation à un autre chef de chantier ou au
          CDT depuis ton profil. Sinon les dossiers sont bloqués.
        </p>
      </HelpSection>

      <HelpTip>
        Traite la file <strong>chaque jour</strong> — un dossier bloqué peut empêcher un
        ouvrier de toucher un avantage ou de prendre congé en temps voulu.
      </HelpTip>
    </>
  );
}
