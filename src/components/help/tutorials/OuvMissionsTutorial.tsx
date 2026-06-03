"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function OuvMissionsTutorial() {
  return (
    <>
      <p className="mb-4">
        Tes <strong>tâches du jour</strong> : ce que le chef te demande de faire,
        l&apos;équipe avec qui tu travailles, les engins et matières associés.
      </p>

      <HelpSection title="Lire ta mission">
        <p>
          Description, lot/ouvrage concerné, équipe, chef d&apos;équipe, durée prévue,
          engins requis (CACES nécessaire indiqué).
        </p>
      </HelpSection>

      <HelpSection title="Signaler la fin">
        <p>
          Quand la tâche est terminée, bouton <strong>« Tâche faite »</strong>. Le chef
          de chantier voit immédiatement l&apos;avancement.
        </p>
      </HelpSection>

      <HelpSection title="Signaler un blocage">
        <p>
          Si tu ne peux pas faire la tâche (matière manquante, engin en panne, blessure),
          bouton <strong>« Bloqué »</strong> + motif. Le chef est notifié.
        </p>
      </HelpSection>

      <HelpTip>
        Avant de commencer une tâche, vérifie que tu as bien tes EPI et que tes
        habilitations sont à jour (si engin, vérifier CACES).
      </HelpTip>
    </>
  );
}
