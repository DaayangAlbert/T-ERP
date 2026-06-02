"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DafPaieTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Cycle de paie côté DAF</strong> : tu reçois la paie soumise par les RH, tu la
        contrôles, tu valides en N2. Au-delà du seuil, elle passe au DG en N3 avant émission.
      </p>

      <HelpSection title="Workflow">
        <ol className="ml-5 list-decimal">
          <li><strong>RH</strong> lance le cycle et calcule les bulletins (statut DRAFT).</li>
          <li><strong>RH</strong> soumet à validation (statut PENDING_DAF).</li>
          <li><strong>Toi (DAF)</strong> contrôles ici puis valides en N2 (statut PENDING_DG ou EXECUTABLE selon le seuil).</li>
          <li><strong>DG</strong> valide en N3 si nécessaire (statut EXECUTABLE).</li>
          <li>RH émet les bulletins → écritures comptables + virements.</li>
        </ol>
      </HelpSection>

      <HelpSection title="Contrôler la paie">
        <p>Avant de valider, vérifie :</p>
        <ul className="ml-5 list-disc">
          <li><strong>Masse salariale totale</strong> : cohérence avec les mois précédents (écart &gt; 10 % = enquête).</li>
          <li><strong>Charges patronales</strong> : CNPS 16,2 %, CFC 1,5 %, FNE 1 %, AT (1,75 à 5 % selon secteur).</li>
          <li><strong>Bulletins individuels</strong> : pas de salaire net &lt; SMIG (36 270 FCFA).</li>
          <li><strong>Heures sup</strong> : ratio cohérent (objectif &lt; 10 % de la masse).</li>
          <li><strong>Avances retenues</strong> : conformes aux accords donnés par RH.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Valider ou retourner">
        <HelpSteps>
          <li>Bouton <strong>« Valider N2 »</strong> : passe au DG (si seuil) ou direct EXECUTABLE.</li>
          <li>Bouton <strong>« Retourner aux RH »</strong> avec motif : corrections demandées. La paie redevient brouillard côté RH.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Une paie validée et émise est <strong>irréversible</strong>. Les corrections passent par
        une <strong>paie de rappel</strong> le mois suivant.
      </HelpWarn>

      <HelpTip>
        Cible : la paie est validée DAF <strong>au plus tard le 28</strong> pour permettre les
        virements le 1ᵉʳ du mois. Sois proactif si les RH tardent.
      </HelpTip>
    </>
  );
}
