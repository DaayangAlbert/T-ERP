"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CcEquipesTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue de ton <strong>équipe</strong> : composition, qualifications, habilitations HSE,
        disponibilité du jour.
      </p>

      <HelpSection title="Composition">
        <p>
          Liste des ouvriers affectés à ton équipe : nom, statut, ancienneté, métier
          principal (maçon, ferrailleur, coffreur, conducteur d&apos;engin…).
        </p>
      </HelpSection>

      <HelpSection title="Qualifications & habilitations">
        <p>
          Pour chaque ouvrier : CACES, travail en hauteur, SST, électricien. Badge rouge si
          expirée — la personne ne peut PAS exercer la tâche correspondante.
        </p>
      </HelpSection>

      <HelpSection title="Disponibilité">
        <p>
          État du jour : présent, en congé, en formation, en arrêt. Synchronisé avec le
          pointage et les modules RH.
        </p>
      </HelpSection>

      <HelpTip>
        Si tu as besoin d&apos;un renfort ou si un ouvrier expire ses habilitations, signale
        au CDT depuis cette page (bouton <strong>« Demande »</strong>).
      </HelpTip>
    </>
  );
}
