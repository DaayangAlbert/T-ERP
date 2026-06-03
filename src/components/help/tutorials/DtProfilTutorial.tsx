"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>espace personnel DT</strong> : profil, préférences alertes, supervision
        des équipes techniques (DTrav, CDT, CC).
      </p>

      <HelpSection title="Profil">
        <p>
          Avatar, coordonnées, signature électronique (utilisée pour les rapports DT
          signés).
        </p>
      </HelpSection>

      <HelpSection title="Équipe technique supervisée">
        <p>
          Liste des Directeurs de Travaux, Conducteurs de Travaux et Chefs de Chantier que
          tu pilotes. Vue agrégée de leur charge, des chantiers, des objectifs individuels.
        </p>
      </HelpSection>

      <HelpSection title="Préférences alertes">
        <ul className="ml-5 list-disc">
          <li>Incidents QHSE critiques.</li>
          <li>Retards chantier &gt; 15 j.</li>
          <li>Dérive marge &gt; 10 %.</li>
          <li>Validations marchés en attente &gt; 5 j.</li>
          <li>AO à dépôt imminent.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Délègue tes validations marchés quand tu pars en congé (page Validations → onglet
        Délégations). Sinon le pipeline est bloqué pendant ton absence.
      </HelpTip>
    </>
  );
}
