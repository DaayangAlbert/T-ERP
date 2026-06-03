"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function OuvPointageTutorial() {
  return (
    <>
      <p className="mb-4">
        Pointer ton <strong>arrivée et ton départ</strong> du chantier. C&apos;est ça
        qui calcule ta paie — sois rigoureux.
      </p>

      <HelpSection title="Pointer le matin">
        <HelpSteps>
          <li>À l&apos;arrivée, ouvre l&apos;application.</li>
          <li>Bouton vert <strong>« J&apos;arrive »</strong>.</li>
          <li>L&apos;application enregistre l&apos;heure + ta position GPS.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Pointer le soir">
        <p>
          À la fin de la journée : bouton rouge <strong>« Je pars »</strong>. Si tu pars
          avant l&apos;heure, motif demandé (visite médicale, urgence, etc.).
        </p>
      </HelpSection>

      <HelpSection title="Heures supplémentaires">
        <p>
          Si tu restes au-delà de l&apos;horaire normal, le système calcule
          automatiquement tes heures sup. Le chef les valide en fin de semaine.
        </p>
      </HelpSection>

      <HelpTip>
        Si tu oublies de pointer, demande au chef de chantier qu&apos;il rattrape la
        saisie — sinon ta journée n&apos;est pas payée.
      </HelpTip>
    </>
  );
}
