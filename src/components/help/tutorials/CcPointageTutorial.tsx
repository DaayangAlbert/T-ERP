"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcPointageTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Pointage des présences</strong> au démarrage et à la fin de la journée pour
        chaque ouvrier de ton équipe.
      </p>

      <HelpSection title="Pointer le matin">
        <HelpSteps>
          <li>Liste des ouvriers affectés s&apos;affiche.</li>
          <li>Coche <strong>« Présent »</strong> pour chaque arrivée.</li>
          <li><strong>« Absent »</strong> + motif (maladie, congé, sans nouvelle).</li>
          <li><strong>« Retard »</strong> + heure d&apos;arrivée réelle.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Pointer le soir">
        <p>
          À 17 h (ou heure de fin), retour sur la page → coche le départ de chaque ouvrier.
          Si départ anticipé (visite médicale, urgence), saisis l&apos;heure et le motif.
        </p>
      </HelpSection>

      <HelpSection title="Heures supplémentaires">
        <p>
          Si un ouvrier dépasse l&apos;horaire, le temps en plus est automatiquement
          comptabilisé. Tu valides ensuite via la page <strong>« Heures sup »</strong>.
        </p>
      </HelpSection>

      <HelpTip>
        Un pointage juste = paie juste. Ne te trompe pas, ne pointe pas à la place d&apos;un
        autre, ne valide rien sans avoir vu la personne.
      </HelpTip>
    </>
  );
}
