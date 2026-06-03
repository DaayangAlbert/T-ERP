"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function EmpPaieTutorial() {
  return (
    <>
      <p className="mb-4">
        Tes <strong>bulletins de paie</strong> mensuels : consultation, téléchargement,
        historique complet depuis ton embauche.
      </p>

      <HelpSection title="Bulletin du mois">
        <p>
          Détail clair : salaire de base, heures sup, primes, indemnités, déductions
          (CNPS, IRPP), net à payer. Tape une ligne pour son explication.
        </p>
      </HelpSection>

      <HelpSection title="Télécharger en PDF">
        <p>
          Bouton <strong>« Télécharger PDF »</strong> sur chaque bulletin. À conserver
          pour : déclarations fiscales, dossiers bancaires, location, prêts.
        </p>
      </HelpSection>

      <HelpSection title="Historique">
        <p>
          Tous tes bulletins depuis ton embauche. Recherche par année. Tu peux télécharger
          un récapitulatif annuel pour ta déclaration IRPP.
        </p>
      </HelpSection>

      <HelpSection title="Erreur sur la paie ?">
        <p>
          Signale immédiatement au RH (via le chat ou ta hiérarchie). Rectification
          possible jusqu&apos;à la paie suivante.
        </p>
      </HelpSection>

      <HelpTip>
        La paie tombe normalement le <strong>5 du mois suivant</strong>. Un message
        d&apos;information apparaît si le versement est décalé.
      </HelpTip>
    </>
  );
}
