"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function PresenceTutorial() {
  return (
    <>
      <p className="mb-4">
        Module <strong>Présence</strong> consolidé : pointages, présences, retards,
        absences sur tous les chantiers — base pour la paie et le pilotage RH.
      </p>

      <HelpSection title="Vue d&apos;ensemble">
        <p>
          Effectif théorique vs présents du jour, taux de présence global, top
          retardataires, top absentéistes. Filtre par chantier et par jour.
        </p>
      </HelpSection>

      <HelpSection title="Détail pointages">
        <HelpSteps>
          <li>Sélectionne un chantier + une date.</li>
          <li>Tableau des pointages : nom, heure arrivée, heure départ, total heures, statut.</li>
          <li>Corriger un pointage : icône crayon → modal édition (motif obligatoire, historisé).</li>
          <li>Ajouter un pointage manuel : bouton <strong>« Ajouter »</strong> en cas d&apos;oubli.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Anomalies">
        <p>
          Pointages incohérents : heure départ &lt; heure arrivée, durée &gt; 14 h,
          ouvrier non affecté au chantier. Badge rouge — à corriger avant la clôture
          de la semaine.
        </p>
      </HelpSection>

      <HelpSection title="Export paie">
        <p>
          Bouton <strong>« Export paie »</strong> en fin de période : génère le fichier
          consolidé qui alimente le calcul de la paie (heures normales, sup, nuit,
          fériés).
        </p>
      </HelpSection>

      <HelpTip>
        Toute correction de pointage doit être motivée (vol RH, oubli, panne app) et
        validée par le chef de chantier — c&apos;est la traçabilité qui te protège en
        cas de contrôle inspection du travail.
      </HelpTip>
    </>
  );
}
