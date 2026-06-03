"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function ItPointageTutorial() {
  return (
    <>
      <p className="mb-4">
        Outils <strong>techniques de pointage</strong> : diagnostic, correction
        d&apos;anomalies, paramétrage du geofencing.
      </p>

      <HelpSection title="Diagnostic pointage">
        <p>
          Vue agrégée des problèmes de pointage : ouvriers sans matricule, sans
          chantier, geofence mal configuré, doublons, GPS imprécis.
        </p>
      </HelpSection>

      <HelpSection title="Paramétrage geofence">
        <HelpSteps>
          <li>Sélectionne un site → carte avec rayon actuel.</li>
          <li>Ajuste lat/long et rayon.</li>
          <li>Test : simule un pointage à différentes positions GPS.</li>
          <li>Valide → applique immédiatement, tous les ouvriers du site sont concernés.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Correction de masse">
        <p>
          Outil de réécriture de pointages erronés (ex. décalage horaire d&apos;une
          journée). Réservé aux cas d&apos;urgence — toujours valider avec RH avant.
        </p>
      </HelpSection>

      <HelpTip>
        Avant d&apos;ajuster un geofence, demande au CDT terrain si l&apos;emprise du
        chantier a changé — une mauvaise modification peut bloquer toute une équipe au
        pointage.
      </HelpTip>
    </>
  );
}
