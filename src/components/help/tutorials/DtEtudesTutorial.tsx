"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtEtudesTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Études et offres</strong> : suivi des appels d&apos;offres en cours
        d&apos;analyse, préparation des soumissions, dépôts, et résultats (attribution /
        rejet). C&apos;est le pipeline commercial vu sous l&apos;angle technique.
      </p>

      <HelpSection title="Pipeline d'étude">
        <ul className="ml-5 list-disc">
          <li><strong>Veille / Repérage</strong> : AO identifiés à étudier.</li>
          <li><strong>Analyse DCE</strong> : étude du dossier de consultation.</li>
          <li><strong>Métré</strong> : quantitatif des ouvrages.</li>
          <li><strong>Estimation</strong> : prix unitaires + marge cible.</li>
          <li><strong>Mémoire technique</strong> : rédaction de la note.</li>
          <li><strong>Soumission</strong> : dépôt officiel.</li>
          <li><strong>Notification</strong> : attribué (✓) ou rejeté (✗).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Nouvelle étude">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel AO »</strong>.</li>
          <li>MOA, intitulé, type d&apos;ouvrage, date limite dépôt, caution provisoire.</li>
          <li>Assigne un chef d&apos;étude responsable.</li>
          <li>L&apos;étude entre dans le pipeline en stage « Analyse DCE ».</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Décision de soumissionner">
        <p>
          À chaque étape, possibilité de <strong>renoncer</strong> avec motif (concurrence
          trop forte, marges insuffisantes, MOA douteux…). Le go/no-go au stade Estimation
          est la décision la plus stratégique.
        </p>
      </HelpSection>

      <HelpTip>
        Les AO attribués passent automatiquement dans le <strong>Portefeuille chantiers</strong>
        après notification + validation marché (page Validations marchés).
      </HelpTip>
    </>
  );
}
