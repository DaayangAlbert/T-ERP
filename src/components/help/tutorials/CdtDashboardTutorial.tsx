"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CdtDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord du <strong>Conducteur de Travaux</strong> : vue terrain
        opérationnelle sur le chantier actif (cadence, qualité, ressources, alertes).
      </p>

      <HelpSection title="KPIs jour">
        <p>
          Cadence réalisée vs prévue, équipes présentes, engins disponibles, incidents 24 h.
          Cliquer une tuile zoome sur la page détaillée.
        </p>
      </HelpSection>

      <HelpSection title="Alertes terrain">
        <p>
          Liste consolidée : rupture appro imminente, retard tâche, NC qualité ouverte,
          visite MOE/BCT planifiée. Clic → fiche détail + action.
        </p>
      </HelpSection>

      <HelpSection title="Vue activité">
        <p>
          Frise des événements de la journée : pointages, livraisons, attachements, photos,
          rapports CDT remontés du Chef Chantier.
        </p>
      </HelpSection>

      <HelpTip>
        Le sélecteur de chantier en haut filtre toutes les pages du module. Si tu suis
        plusieurs chantiers, change-le avant d&apos;analyser une page.
      </HelpTip>
    </>
  );
}
