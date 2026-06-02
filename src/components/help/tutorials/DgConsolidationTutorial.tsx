"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DgConsolidationTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Consolidation du groupe</strong> : si la société tête (holding) a des
        filiales, cette page agrège les KPI de toutes les entités. Tu peux ensuite
        <strong> descendre dans une filiale</strong> pour voir ses chiffres détaillés.
      </p>

      <HelpSection title="Vue groupe">
        <p>
          Tableau de toutes les filiales avec : CA, marge, trésorerie, effectif, statut.
          Chaque ligne est cliquable pour ouvrir le détail.
        </p>
      </HelpSection>

      <HelpSection title="Drill-down filiale">
        <HelpSteps>
          <li>Clique sur une filiale pour voir sa <strong>fiche détaillée</strong>.</li>
          <li>Vue identique au tableau de bord DG mais restreinte à cette entité.</li>
          <li>Bouton <strong>« Retour groupe »</strong> en haut pour revenir à la vue consolidée.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Exports">
        <p>
          Bouton <strong>« Exporter PDF »</strong> : reporting groupe pour le CAC ou les
          banquiers. Le PDF embarque le détail par filiale + le consolidé.
        </p>
      </HelpSection>

      <HelpTip>
        La consolidation respecte les <strong>retraitements OHADA</strong> : élimination des
        flux intragroupe, des dividendes intragroupe, et des marges sur stocks circulant
        entre entités.
      </HelpTip>
    </>
  );
}
