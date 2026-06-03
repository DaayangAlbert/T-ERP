"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CcPlanningTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton <strong>planning de la semaine</strong> : tâches affectées à ton équipe par jour,
        avec engins et matières requis.
      </p>

      <HelpSection title="Vue semaine">
        <p>
          Une ligne par jour, les tâches successives. Couleur : à faire (gris), en cours
          (violet), fait (vert). Tape une tâche pour le détail.
        </p>
      </HelpSection>

      <HelpSection title="Détail d&apos;une tâche">
        <p>
          Description, durée prévue, engins assignés, matière à approvisionner, équipe
          attendue. Indique tout ce qu&apos;il faut pour démarrer.
        </p>
      </HelpSection>

      <HelpSection title="Signaler un blocage">
        <p>
          Si une tâche est impossible (matière absente, équipe insuffisante, météo) →
          bouton <strong>« Signaler blocage »</strong>. Notifie immédiatement le CDT.
        </p>
      </HelpSection>

      <HelpTip>
        Le planning est posé par le CDT. Tu peux signaler les problèmes mais ne pas
        réorganiser unilatéralement — le risque est de casser la chaîne (engins,
        livraisons, sous-traitants).
      </HelpTip>
    </>
  );
}
