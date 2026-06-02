"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function ValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        Page <strong>« Préparation comptable amont »</strong> : liste des dépenses / engagements
        actuellement à l&apos;étape DAF. Toi, comptable, tu prépares la <strong>pièce comptable</strong>
        et l&apos;<strong>écriture</strong> en avance pour que la validation officielle du DAF aille
        vite.
      </p>

      <HelpSection title="Lecture de la file">
        <p>Chaque ligne représente une validation en attente, avec :</p>
        <ul className="ml-5 list-disc">
          <li><strong>Référence + intitulé</strong> de la pièce concernée.</li>
          <li><strong>Initiateur</strong> : qui a lancé la demande.</li>
          <li><strong>Montant</strong> de l&apos;engagement.</li>
          <li><strong>Type</strong> de validation.</li>
          <li><strong>Âge</strong> : nombre de jours d&apos;attente — orange à 3 j, rouge à 7 j.</li>
          <li><strong>Priorité</strong> : URGENT / HIGH / NORMAL / LOW.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Préparer une écriture en amont">
        <HelpSteps>
          <li>Choisis une ligne (priorité URGENT/HIGH d&apos;abord).</li>
          <li>Clique sur <strong>« Préparer l&apos;écriture »</strong>.</li>
          <li>Tu es redirigé vers <strong>Saisie d&apos;écritures</strong> ; remplis l&apos;écriture en brouillard avec la pièce justificative attachée.</li>
          <li>Reviens ensuite ici : la validation suivra son cours côté DAF.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>En attente</strong> : combien d&apos;items à traiter.</li>
          <li><strong>Urgentes / Hautes</strong> : prioritaires (rouge si &gt; 0).</li>
          <li><strong>Montant cumulé</strong> : enveloppe totale en attente de validation.</li>
          <li><strong>Plus ancienne</strong> : âge max — vise &lt; 7 jours.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Pour <strong>tout le circuit de validation</strong> (étapes en amont et en aval), clique sur
        <strong> « Tout le circuit »</strong> en haut à droite.
      </HelpTip>
    </>
  );
}
