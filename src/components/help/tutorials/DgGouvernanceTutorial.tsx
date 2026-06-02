"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DgGouvernanceTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Calendrier de gouvernance et historique des décisions</strong> : Conseil
        d&apos;administration, Assemblées générales, comités spécialisés. C&apos;est ton agenda
        stratégique et ta mémoire des décisions prises.
      </p>

      <HelpSection title="Calendrier">
        <p>
          Vue agenda des prochaines réunions de gouvernance : date, type (CA, AG, Comité
          stratégique, Comité d&apos;audit, Comité QHSE), participants attendus, ordre du jour
          provisoire, documents préparatoires.
        </p>
      </HelpSection>

      <HelpSection title="Préparer une réunion">
        <HelpSteps>
          <li>Clique sur l&apos;événement → ouvre la fiche.</li>
          <li>Joins les documents préparatoires (rapports mensuels signés, propositions, projets de résolutions).</li>
          <li>Confirme la liste des participants — chacun reçoit une convocation.</li>
          <li>Après la réunion : enregistre les <strong>décisions prises</strong> et le PV.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Historique des décisions">
        <p>
          Liste chronologique de toutes les décisions prises en gouvernance. Filtrable par
          année, par type d&apos;organe, par sujet. Indispensable pour suivre la mise en
          œuvre.
        </p>
      </HelpSection>

      <HelpTip>
        Les <strong>décisions stratégiques</strong> (orientations, investissements, M&A…)
        sont publiées dans l&apos;espace <strong>Propriétaire / PCA</strong> pour suivi par les
        actionnaires.
      </HelpTip>
    </>
  );
}
