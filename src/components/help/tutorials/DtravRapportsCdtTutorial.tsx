"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravRapportsCdtTutorial() {
  return (
    <>
      <p className="mb-4">
        Consultation et validation des <strong>rapports rédigés par les Conducteurs Travaux</strong>
        de ton chantier (rapports journaliers et hebdomadaires).
      </p>

      <HelpSection title="Liste des rapports">
        <p>
          Liste paginée des rapports CDT : auteur, date, type (journalier/hebdo), statut
          (brouillon, soumis, validé). Couleur orange = en attente d&apos;action.
        </p>
      </HelpSection>

      <HelpSection title="Valider un rapport">
        <HelpSteps>
          <li>Clique un rapport <strong>« Soumis »</strong>.</li>
          <li>Lis : météo, équipes présentes, avancements, incidents, livraisons, visites MOE.</li>
          <li><strong>« Valider »</strong> si correct → consolidé dans le rapport mensuel DTrav.</li>
          <li><strong>« Renvoyer »</strong> avec commentaire si manquements (photos absentes, incident non détaillé…).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Consolidation hebdo">
        <p>
          Le bouton <strong>« Rapport hebdo consolidé »</strong> agrège tous les rapports
          journaliers validés de la semaine en un PDF unique pour le DT.
        </p>
      </HelpSection>

      <HelpTip>
        Ne valide jamais un rapport sans avoir lu les <strong>incidents HSE</strong> — c&apos;est
        ce qui remonte dans le bilan QHSE du mois.
      </HelpTip>
    </>
  );
}
