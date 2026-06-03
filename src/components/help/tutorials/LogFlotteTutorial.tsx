"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function LogFlotteTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion de la <strong>flotte de véhicules et engins</strong> : caractéristiques,
        affectation, kilométrage, contrôles réglementaires.
      </p>

      <HelpSection title="Fiche véhicule">
        <p>
          Immatriculation, type (camion, pick-up, grue, chargeuse…), conducteur
          attitré, chantier d&apos;affectation actuel, kilométrage, niveau carburant.
        </p>
      </HelpSection>

      <HelpSection title="Contrôles réglementaires">
        <p>
          Pour chaque véhicule : visite technique, assurance, tachygraphe (si poids
          lourd), CACES conducteur. Badge rouge si expiration &lt; 30 jours.
        </p>
      </HelpSection>

      <HelpSection title="Affecter / réaffecter">
        <HelpSteps>
          <li>Bouton <strong>« Affecter »</strong> sur la fiche véhicule.</li>
          <li>Chantier de destination + dates + conducteur.</li>
          <li>Valider → notifie le CDT du chantier d&apos;arrivée.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Ne JAMAIS faire rouler un véhicule avec un papier expiré (assurance, visite
        technique). Risque : pas de couverture en cas d&apos;accident + retrait du permis
        du conducteur + amende pour l&apos;entreprise.
      </HelpWarn>

      <HelpTip>
        Anticipe : 60 jours avant expiration, ouvre la procédure de renouvellement avec
        les Achats / SG.
      </HelpTip>
    </>
  );
}
