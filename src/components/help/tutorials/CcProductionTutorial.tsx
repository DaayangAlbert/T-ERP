"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcProductionTutorial() {
  return (
    <>
      <p className="mb-4">
        Saisie de la <strong>production journalière</strong> de ton équipe : quantités
        réalisées par poste (béton, étanchéité, ferraillage…).
      </p>

      <HelpSection title="Saisir une production">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle production »</strong>.</li>
          <li>Choisis le poste / l&apos;ouvrage (depuis le bordereau).</li>
          <li>Renseigne la quantité produite (m³, m², ml, u).</li>
          <li>Photo (recommandé) du résultat.</li>
          <li>Valide — le CDT verra la saisie pour validation.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Avancement cumulé">
        <p>
          Tu vois immédiatement le cumul depuis le début + % d&apos;avancement vs prévu.
          Si l&apos;équipe est en retard, c&apos;est visible ici.
        </p>
      </HelpSection>

      <HelpTip>
        Saisir à 17 h chaque jour. Une saisie tardive ou groupée nuit à la traçabilité et
        peut être rejetée par le CDT.
      </HelpTip>
    </>
  );
}
