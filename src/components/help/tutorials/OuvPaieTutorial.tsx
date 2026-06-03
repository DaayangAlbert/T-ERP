"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvPaieTutorial() {
  return (
    <>
      <p className="mb-4">
        Ta <strong>fiche de paie</strong> du mois et l&apos;historique des paies
        précédentes. Détail clair de ce que tu touches.
      </p>

      <HelpSection title="Lecture">
        <p>
          Salaire de base, heures sup, primes, indemnités, déductions (CNPS, IRPP),
          net à payer. Tape chaque ligne pour comprendre le calcul.
        </p>
      </HelpSection>

      <HelpSection title="Télécharger">
        <p>
          Bouton <strong>« Télécharger PDF »</strong> pour ton bulletin officiel. À
          conserver — utile pour banque, prêt, location.
        </p>
      </HelpSection>

      <HelpSection title="Historique">
        <p>
          Liste de toutes tes paies depuis ton embauche. Recherche par mois si besoin.
        </p>
      </HelpSection>

      <HelpSection title="Erreur sur la paie ?">
        <p>
          Si tu vois une erreur (heures sup non comptées, prime oubliée), signale au
          chef de chantier qui remonte au RH. Une rectification est possible jusqu&apos;à
          la paie suivante.
        </p>
      </HelpSection>

      <HelpTip>
        La paie tombe normalement le <strong>5 du mois suivant</strong>. Si retard,
        renseigne-toi auprès du chef avant de t&apos;inquiéter.
      </HelpTip>
    </>
  );
}
