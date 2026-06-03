"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CdtPlanTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Plan de la journée</strong> : tâches à exécuter, équipes affectées, engins
        et matières mobilisés. Vue prête-à-l&apos;emploi pour briefer les chefs d&apos;équipe.
      </p>

      <HelpSection title="Lecture du plan">
        <p>
          Une ligne par tâche : lot, durée prévue, équipe titulaire, chef d&apos;équipe,
          engins, matières requises. Statut visuel (à faire / en cours / fait).
        </p>
      </HelpSection>

      <HelpSection title="Mettre à jour l&apos;avancement">
        <HelpSteps>
          <li>Tape la tâche → modal d&apos;avancement.</li>
          <li>Renseigne la quantité réalisée ou le % d&apos;avancement.</li>
          <li>Photo (recommandé) + commentaire si écart.</li>
          <li>Valider — propagé à la production et au planning macro.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Reporter une tâche">
        <p>
          Sur la ligne, bouton <strong>« Reporter »</strong> → date proposée. Si la tâche
          est sur le chemin critique, T-ERP affiche un avertissement (impact jalon).
        </p>
      </HelpSection>

      <HelpTip>
        Le plan du jour est généré depuis le <strong>planning opérationnel</strong> du DTrav.
        Les modifications majeures doivent être validées avec lui.
      </HelpTip>
    </>
  );
}
