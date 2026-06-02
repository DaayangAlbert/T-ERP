"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>espace DAF personnel</strong> : profil, avatar, préférences alertes, gestion
        des comptables que tu supervises.
      </p>

      <HelpSection title="Avatar et profil">
        <p>
          Téléverse une photo, vérifie tes coordonnées. Elles apparaissent dans les rapports
          signés et la messagerie.
        </p>
      </HelpSection>

      <HelpSection title="Comptables sous ma supervision">
        <p>
          Liste des comptables (Direction + Chantier) de la société. Tu peux affecter/retirer
          un comptable à un chantier, et déléguer temporairement tes validations N2.
        </p>
      </HelpSection>

      <HelpSection title="Préférences alertes">
        <p>
          Choisis quelles alertes tu veux recevoir par email / push :
        </p>
        <ul className="ml-5 list-disc">
          <li>Validations N2 urgentes (&lt; 24 h).</li>
          <li>Tension de trésorerie (solde &lt; seuil X).</li>
          <li>Échéances fiscales J-7.</li>
          <li>Dépassement budget chantier.</li>
          <li>Recouvrement &gt; 90 j.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Délègue tes validations N2 quand tu pars en congé (page Validations → Délégations).
        Sinon le pipeline est bloqué pendant ton absence.
      </HelpTip>
    </>
  );
}
