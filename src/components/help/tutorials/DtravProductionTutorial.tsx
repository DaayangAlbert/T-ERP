"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravProductionTutorial() {
  return (
    <>
      <p className="mb-4">
        Pilotage de l&apos;avancement physique et de l&apos;attachement des quantités produites
        sur le chantier actif.
      </p>

      <HelpSection title="Avancement par lot/ouvrage">
        <p>
          Liste des postes du bordereau : quantité prévue, quantité réalisée cumulée, %
          avancement, écart vs planning. Couleur verte si dans les temps, rouge si retard.
        </p>
      </HelpSection>

      <HelpSection title="Saisir un attachement">
        <HelpSteps>
          <li>Clique <strong>« Nouvel attachement »</strong>.</li>
          <li>Choisis le poste concerné (béton, étanchéité, ferraillage…).</li>
          <li>Renseigne la quantité réalisée du jour (m³, m², ml, u).</li>
          <li>Ajoute une photo (recommandé) + signataire MOE si présent.</li>
          <li>Valider — l&apos;avancement cumulé est recalculé automatiquement.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Cadence vs planning">
        <p>
          Graphique courbe S : cumul prévu vs cumul réalisé. Permet de visualiser un
          décrochage avant qu&apos;il n&apos;impacte le jalon.
        </p>
      </HelpSection>

      <HelpTip>
        Un attachement signé du MOE est <strong>juridiquement opposable</strong> : il sert de
        base à la situation mensuelle. Ne jamais saisir une quantité sans la vérification du
        Conducteur Travaux.
      </HelpTip>
    </>
  );
}
