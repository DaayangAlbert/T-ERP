"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DgPipelineTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Pipeline commercial</strong> : suivi des appels d&apos;offres en cours, des
        prospects, des soumissions, des marchés en attente d&apos;attribution. Outil de
        prévision du CA futur.
      </p>

      <HelpSection title="Étapes du pipeline">
        <ul className="ml-5 list-disc">
          <li><strong>Veille</strong> : AO repérés, à étudier.</li>
          <li><strong>Étude</strong> : DT prépare l&apos;offre technique et financière.</li>
          <li><strong>Soumission</strong> : offre déposée, en attente de la commission.</li>
          <li><strong>Notification</strong> : attribué (✓) ou rejeté (✗).</li>
          <li><strong>Marché signé</strong> : OS reçu, démarrage chantier.</li>
        </ul>
      </HelpSection>

      <HelpSection title="KPI commercial">
        <ul className="ml-5 list-disc">
          <li><strong>Taux de succès</strong> : marchés attribués / offres soumises (12 mois).</li>
          <li><strong>Pipeline en valeur</strong> : somme des montants des offres en cours, pondérée par probabilité.</li>
          <li><strong>Délai moyen attribution</strong> : entre soumission et notification.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Carnet de commandes">
        <p>
          Total des marchés signés non encore facturés (= « backlog »). Indicateur clé pour
          la visibilité 6-12 mois et la confiance bancaire.
        </p>
      </HelpSection>

      <HelpTip>
        Le suivi opérationnel des AO se fait dans l&apos;espace <strong>Direction Technique →
        Études et offres</strong>. Ici c&apos;est la vue stratégique consolidée.
      </HelpTip>
    </>
  );
}
