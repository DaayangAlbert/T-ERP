"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CcProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton espace personnel <strong>Chef Chantier</strong> : profil, mes équipes, mes
        congés, mes formations, agenda.
      </p>

      <HelpSection title="Mon profil">
        <p>
          Photo, coordonnées, ancienneté, qualifications acquises. Tu peux mettre à jour ta
          photo et ton numéro de téléphone.
        </p>
      </HelpSection>

      <HelpSection title="Mes équipes">
        <p>
          Liste des équipes dont tu es responsable. Tape une équipe pour voir le détail des
          ouvriers, qualifications, pointages cumulés.
        </p>
      </HelpSection>

      <HelpSection title="Mes congés">
        <p>
          Solde restant, historique. Pour poser : bouton <strong>« Nouvelle demande »</strong> —
          la demande remonte au CDT pour validation.
        </p>
      </HelpSection>

      <HelpSection title="Mes formations">
        <p>
          Formations suivies, à venir, expirations CACES/SST/etc. Anticipe les
          renouvellements — une habilitation expirée te retire le droit d&apos;exercer
          certaines tâches.
        </p>
      </HelpSection>

      <HelpTip>
        Tes notifications (validations à faire, livraisons, incidents) sont configurables
        ici : email, push, ou in-app.
      </HelpTip>
    </>
  );
}
