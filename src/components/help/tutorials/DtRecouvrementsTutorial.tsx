"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtRecouvrementsTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>technique</strong> des recouvrements en cours : pour chaque MOA, les
        situations émises non encaissées. Te permet d&apos;identifier les blocages
        techniques (refus MOA pour défauts d&apos;exécution, levée de réserves) avant le
        passage en contentieux.
      </p>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li>Chantier + MOA.</li>
          <li>Situations émises non encaissées (montant + date).</li>
          <li>Antériorité (jours de retard).</li>
          <li>Motif de blocage (s&apos;il est saisi) : réserves, OS modificatif en attente, contrôle technique.</li>
          <li>Niveau de relance (R1/R2/R3).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Ton rôle">
        <p>
          En tant que DT, tu interviens sur les blocages <strong>techniques</strong> :
          coordination avec le MOA pour lever les réserves, validation des OS modificatifs,
          décision de provoquer un constat d&apos;huissier sur ouvrage. Le suivi des
          relances et l&apos;exécution du recouvrement restent côté DAF.
        </p>
      </HelpSection>

      <HelpTip>
        La gestion opérationnelle du recouvrement (relances R1/R2/R3, contentieux) est dans
        l&apos;espace <strong>DAF → Recouvrement</strong>.
      </HelpTip>
    </>
  );
}
