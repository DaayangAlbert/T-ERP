"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CdtPlanningTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Planning sur la semaine</strong> : vue par jour des tâches affectées, des
        équipes et des engins. Permet de préparer la semaine, identifier les conflits.
      </p>

      <HelpSection title="Grille jours × ressources">
        <p>
          Chaque cellule = une affectation (tâche + équipe + engin). Drag&apos;n drop pour
          réorganiser. Badge rouge si une ressource est doublement affectée.
        </p>
      </HelpSection>

      <HelpSection title="Replanifier une affectation">
        <p>
          Clic sur une affectation → modal édition. Modifier équipe, engin, durée. Toutes
          les modifications sont remontées à T-ERP et notifiées au chef d&apos;équipe.
        </p>
      </HelpSection>

      <HelpSection title="Météo et contraintes">
        <p>
          Prévisions météo affichées en surimpression. Une journée pluvieuse signalée en
          orange — pense à reporter les bétonnages.
        </p>
      </HelpSection>

      <HelpTip>
        Pour la vue macro (Gantt par lot, jalons MOA), va sur le planning DTrav. Cette page
        sert au pilotage <strong>opérationnel hebdomadaire</strong>.
      </HelpTip>
    </>
  );
}
