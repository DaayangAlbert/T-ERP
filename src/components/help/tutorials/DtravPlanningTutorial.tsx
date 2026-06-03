"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravPlanningTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Planning macro</strong> du chantier (Gantt par lots et jalons). Vue de
        pilotage stratégique : jalons MOA, chemins critiques, glissements.
      </p>

      <HelpSection title="Gantt par lot">
        <p>
          Une ligne par lot ou ouvrage majeur, avec barres date début / date fin. Les jalons
          MOA apparaissent en losange. Survol = détail (durée, prédécesseurs).
        </p>
      </HelpSection>

      <HelpSection title="Replanifier un lot">
        <p>
          Drag de la barre = décalage des dates. Si le lot est sur le chemin critique,
          T-ERP affiche un avertissement (impact sur jalon final). Toute modification est
          historisée (qui, quand, pourquoi).
        </p>
      </HelpSection>

      <HelpSection title="Comparaison planning de référence">
        <p>
          Bouton <strong>« Afficher le planning contractuel »</strong> superpose la version
          signée. Les zones rouges montrent où le réel diverge.
        </p>
      </HelpSection>

      <HelpTip>
        Pour la planification fine du jour ou de la semaine (équipes, engins, tâches
        élémentaires), utilise l&apos;onglet <strong>« Planning opérationnel »</strong>.
      </HelpTip>
    </>
  );
}
