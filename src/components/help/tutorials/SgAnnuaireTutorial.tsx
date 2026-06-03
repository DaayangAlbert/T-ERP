"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgAnnuaireTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Annuaire</strong> du groupe : tous les collaborateurs et contacts externes
        avec recherche multi-critères.
      </p>

      <HelpSection title="Collaborateurs">
        <p>
          Liste de tous les salariés du groupe : nom, fonction, direction, filiale,
          coordonnées professionnelles, photo.
        </p>
      </HelpSection>

      <HelpSection title="Contacts externes">
        <p>
          MOA, fournisseurs majeurs, avocats, experts-comptables, banques. Trié par
          catégorie et par filiale.
        </p>
      </HelpSection>

      <HelpSection title="Recherche">
        <p>
          Tape un nom, une direction, une fonction. Filtres avancés disponibles
          (filiale, chantier d&apos;affectation, métier).
        </p>
      </HelpSection>

      <HelpSection title="Mise à jour">
        <p>
          Les coordonnées sont synchronisées avec le module RH. Pour les externes, le
          SG met à jour manuellement.
        </p>
      </HelpSection>

      <HelpTip>
        Garde l&apos;annuaire à jour — c&apos;est lui qui est utilisé en cas
        d&apos;urgence (notification crise, plan d&apos;évacuation, mobilisation rapide).
      </HelpTip>
    </>
  );
}
