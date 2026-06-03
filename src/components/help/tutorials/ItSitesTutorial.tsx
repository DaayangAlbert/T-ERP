"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function ItSitesTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>chantiers / sites</strong> du tenant : création
        administrative, géolocalisation, paramètres opérationnels.
      </p>

      <HelpSection title="Créer un site">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau site »</strong>.</li>
          <li>Code unique (ex. CHT-2026-001), nom complet, MOA, type de marché.</li>
          <li>Coordonnées GPS (lat/long) ou adresse géocodée — utilisé pour le geofencing du pointage.</li>
          <li>Rayon de geofence (rayon en mètres autour des coordonnées où le pointage est valide).</li>
          <li>Date démarrage prévue, date fin contractuelle.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Affecter les responsables">
        <p>
          Person In Charge (DTrav ou CDT), équipes affectées, sous-traitants attendus.
          Synchronisé avec le module RH.
        </p>
      </HelpSection>

      <HelpSection title="Clôturer un site">
        <p>
          En fin de chantier, bouton <strong>« Clôturer »</strong> → statut CLOSED. Les
          données restent consultables (lecture seule), mais aucune nouvelle saisie
          n&apos;est possible.
        </p>
      </HelpSection>

      <HelpTip>
        Un geofence trop petit (&lt; 50 m) génère de fausses anomalies de pointage par
        imprécision GPS. Garde 100-150 m par défaut.
      </HelpTip>
    </>
  );
}
