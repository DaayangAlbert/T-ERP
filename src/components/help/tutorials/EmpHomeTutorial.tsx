"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function EmpHomeTutorial() {
  return (
    <>
      <p className="mb-4">
        Bienvenue dans <strong>Mon espace personnel</strong> — l&apos;accueil de chaque
        collaborateur sur T-ERP.
      </p>

      <HelpSection title="Navigation">
        <p>
          Cinq tuiles d&apos;accès rapide : Tableau de bord, Bulletins de paie, Congés,
          Pointage, Profil. Une tuile = une page de ton espace personnel.
        </p>
      </HelpSection>

      <HelpSection title="En-tête">
        <p>
          Affiche ton nom, ta fonction, ton chantier d&apos;affectation actuel. Si tu vois
          une info incorrecte, signale au RH via une demande de modification depuis ton
          profil.
        </p>
      </HelpSection>

      <HelpTip>
        Cette interface est aussi accessible depuis ton smartphone (responsive). Ajoute
        l&apos;application à ton écran d&apos;accueil pour un accès en un clic.
      </HelpTip>
    </>
  );
}
