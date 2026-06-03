"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaDecomptesTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue des <strong>décomptes / situations</strong> émis aux MOA : facturation des
        chantiers en cours.
      </p>

      <HelpSection title="Situations émises">
        <p>
          Liste des situations mensuelles émises aux MOA : montant, date d&apos;émission,
          date de paiement attendue, statut (émise / acceptée / payée / contestée).
        </p>
      </HelpSection>

      <HelpSection title="Cumul facturé vs cumul réalisé">
        <p>
          Comparaison : ce qui a été facturé au MOA vs ce qui a été physiquement réalisé.
          Un écart négatif (réalisé &gt; facturé) = créance non comptabilisée à régulariser.
        </p>
      </HelpSection>

      <HelpSection title="Situations contestées">
        <p>
          Liste des situations dont le MOA a refusé tout ou partie. Sujets à arbitrer
          (réécriture, médiation, contentieux).
        </p>
      </HelpSection>

      <HelpTip>
        Une situation contestée bloque l&apos;encaissement du mois. Plus tu attends,
        plus la trésorerie souffre. Traite immédiatement.
      </HelpTip>
    </>
  );
}
