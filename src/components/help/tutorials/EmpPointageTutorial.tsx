"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function EmpPointageTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi de tes <strong>pointages</strong> : heures de travail, retards, absences,
        heures supplémentaires.
      </p>

      <HelpSection title="Récap mensuel">
        <p>
          Pour le mois en cours : total heures normales, heures sup, heures de nuit
          (50 %), dimanches/fériés (100 %). C&apos;est ce qui alimente ta paie.
        </p>
      </HelpSection>

      <HelpSection title="Détail par jour">
        <HelpSteps>
          <li>Tableau quotidien : date, heure arrivée, heure départ, statut.</li>
          <li>Tape une ligne pour voir le détail (corrections éventuelles, motifs).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Anomalies">
        <p>
          Pointages manquants, erreur GPS, oubli. Signale immédiatement à ton chef pour
          correction avant la fin de la semaine.
        </p>
      </HelpSection>

      <HelpTip>
        Un pointage juste = paie juste. Vérifie tes heures chaque semaine — l&apos;effort
        de correction est plus simple à chaud qu&apos;en fin de mois.
      </HelpTip>
    </>
  );
}
