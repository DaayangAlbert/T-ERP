"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravPlanningOperationnelTutorial() {
  return (
    <>
      <p className="mb-4">
        Planification <strong>fine du jour et de la semaine</strong> : affectation des
        équipes, des engins et du matériel par tâche élémentaire.
      </p>

      <HelpSection title="Vue semaine">
        <p>
          Grille jours × équipes. Chaque cellule contient la tâche prévue + ressources
          (engin, matière, sous-traitant). Drag&apos;n drop pour réaffecter.
        </p>
      </HelpSection>

      <HelpSection title="Créer une affectation">
        <HelpSteps>
          <li>Clique une cellule vide → modal d&apos;affectation.</li>
          <li>Choisis la tâche (lié à un lot du planning macro).</li>
          <li>Équipe + chef d&apos;équipe + engins requis + matière.</li>
          <li>Valider — l&apos;équipe verra l&apos;affectation dans son appli mobile.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Alertes de conflit">
        <p>
          Si une équipe ou un engin est affecté deux fois sur la même tranche horaire,
          T-ERP affiche un badge rouge — résoudre avant la fin de la planification.
        </p>
      </HelpSection>

      <HelpTip>
        En cas d&apos;intempéries ou d&apos;absence, utiliser le bouton <strong>« Repositionner »</strong> :
        T-ERP propose des créneaux compatibles automatiquement.
      </HelpTip>
    </>
  );
}
