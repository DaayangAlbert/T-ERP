"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravEquipeTutorial() {
  return (
    <>
      <p className="mb-4">
        Vision de l&apos;équipe chantier : <strong>composition, présence du jour,
        qualifications et habilitations HSE</strong>.
      </p>

      <HelpSection title="Composition">
        <p>
          Liste des collaborateurs affectés au chantier : nom, poste, statut (CDI, CDD,
          intérim, sous-traitant), date d&apos;affectation.
        </p>
      </HelpSection>

      <HelpSection title="Présence du jour">
        <p>
          Synthèse pointages : présents, absents, retards. Détail accessible via le module
          Présence. Indispensable pour l&apos;établissement des attachements.
        </p>
      </HelpSection>

      <HelpSection title="Habilitations / qualifications">
        <p>
          Pour chaque collaborateur : conduite engins (CACES), travail en hauteur, SST,
          électricien habilité… Badge rouge si l&apos;habilitation est expirée — la personne
          ne doit pas exercer la tâche correspondante.
        </p>
      </HelpSection>

      <HelpTip>
        Pour demander un renfort ou un remplacement, utilise le bouton <strong>« Demande RH »</strong>
        — la requête remonte au DT puis aux RH avec ton justificatif.
      </HelpTip>
    </>
  );
}
