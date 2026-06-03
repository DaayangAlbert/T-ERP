"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvEquipeTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>équipe du jour</strong> : qui travaille avec toi, qui est le chef
        d&apos;équipe, qui est présent ou absent.
      </p>

      <HelpSection title="Composition">
        <p>
          Liste des collègues de ton équipe, avec leur métier (maçon, ferrailleur…) et
          leur statut du jour (présent, en congé, en formation, absent).
        </p>
      </HelpSection>

      <HelpSection title="Contact rapide">
        <p>
          Tape sur un collègue pour l&apos;appeler ou lui envoyer un message via la
          messagerie de l&apos;application.
        </p>
      </HelpSection>

      <HelpSection title="Chef d&apos;équipe">
        <p>
          La personne référente pour les questions du jour. Si tu as un souci, c&apos;est
          lui que tu vois en premier — avant le chef de chantier.
        </p>
      </HelpSection>

      <HelpTip>
        Travailler ensemble est plus rapide et plus sûr. Si tu vois un collègue prendre
        un risque (pas de casque, pas de harnais), dis-le-lui ou alerte le chef.
      </HelpTip>
    </>
  );
}
