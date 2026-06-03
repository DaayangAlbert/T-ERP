"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtChargeTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Plan de charge des équipes</strong> : visualise l&apos;affectation de chaque
        Conducteur de Travaux et Chef de Chantier sur les chantiers en cours, et leur taux
        d&apos;occupation à 90 jours. Permet d&apos;anticiper les surcharges et les
        sous-occupations.
      </p>

      <HelpSection title="Vue par responsable">
        <p>
          Pour chaque DTrav / CDT / CC : liste des chantiers affectés, leur charge théorique
          en jours/personne, leur durée résiduelle, leur taux d&apos;occupation.
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Vert</strong> : 70 – 100 % (bon usage).</li>
          <li><strong>Orange</strong> : 100 – 130 % (surcharge gérable).</li>
          <li><strong>Rouge</strong> : &gt; 130 % (surcharge critique) ou &lt; 50 % (sous-occupation).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Réaffecter">
        <p>
          Sur une ligne en rouge, possibilité d&apos;ouvrir le détail puis de
          <strong> réaffecter</strong> un chantier vers un collègue disponible. Notification
          automatique aux intéressés.
        </p>
      </HelpSection>

      <HelpSection title="Anticiper">
        <p>
          Vue à 30/60/90 jours : tu vois les chantiers qui se terminent et libèrent des
          ressources, et les nouveaux chantiers (issus du pipeline d&apos;études) à
          affecter. Permet d&apos;anticiper les recrutements ou prêts inter-chantiers.
        </p>
      </HelpSection>

      <HelpTip>
        À combiner avec le module RH (recrutement) : si la charge dépasse durablement la
        capacité, demande l&apos;ouverture d&apos;un poste.
      </HelpTip>
    </>
  );
}
