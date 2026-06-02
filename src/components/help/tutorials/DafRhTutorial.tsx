"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafRhTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>RH financier</strong> : tout ce qui concerne le coût humain.
        Masse salariale, heures supplémentaires, coût par chantier, productivité.
      </p>

      <HelpSection title="Masse salariale">
        <p>
          Évolution mensuelle sur 12 mois glissants, ventilée par catégorie : cadres,
          employés, ouvriers, journaliers. Comparaison avec le budget annuel.
        </p>
      </HelpSection>

      <HelpSection title="Heures supplémentaires">
        <p>
          Vue d&apos;ensemble : volume total d&apos;heures sup, coût (majorations 125 % / 150 % /
          200 %), répartition par chantier. Permet d&apos;identifier les chantiers où la charge
          de travail dépasse l&apos;effectif normal.
        </p>
      </HelpSection>

      <HelpSection title="Coût du personnel par chantier">
        <p>
          Pour chaque chantier : main d&apos;œuvre directe (ouvriers affectés) + cadres
          rattachés. Comparaison avec la marge prévisionnelle.
        </p>
      </HelpSection>

      <HelpSection title="Provisions sociales">
        <p>
          Estimations des engagements : indemnités fin de carrière, congés acquis non pris,
          gratifications et primes annuelles à payer. Permet d&apos;anticiper les sorties de
          cash.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle (contrats, paie, congés, recrutement) se fait dans
        l&apos;espace <strong>RH</strong>. Ici c&apos;est l&apos;angle financier exclusivement.
      </HelpTip>
    </>
  );
}
