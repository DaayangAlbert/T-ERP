"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CcDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord <strong>Chef Chantier</strong> : point d&apos;entrée terrain au plus
        près du chantier. Tout pour démarrer la journée et la clôturer.
      </p>

      <HelpSection title="KPIs du jour">
        <p>
          Effectif présent / attendu, cadence vs objectif, livraisons attendues,
          incidents en cours. Tape une tuile pour zoomer.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Boutons d&apos;accès direct aux tâches les plus fréquentes : pointage,
          saisie production, demande matériel, signalement incident.
        </p>
      </HelpSection>

      <HelpSection title="Alertes terrain">
        <p>
          Rupture imminente, équipe non pointée, NC ouverte, visite MOE programmée.
          Tape pour traiter.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est optimisée pour le téléphone — utilisable en plein chantier,
        une main sur le smartphone.
      </HelpTip>
    </>
  );
}
