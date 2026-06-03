"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravRapportsMensuelsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Rapport mensuel chantier</strong> à destination du Directeur Technique :
        synthèse production, finances, RH, HSE, météo, faits marquants.
      </p>

      <HelpSection title="Créer un nouveau rapport">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau rapport mensuel »</strong>.</li>
          <li>Choisis le mois de référence (1er du mois).</li>
          <li>T-ERP pré-remplit avec les données du chantier : avancement, attachements, incidents, conso matière, météo.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Compléter manuellement">
        <p>
          Tu enrichis : analyse des écarts, actions correctives, alerte sur risques, points
          à arbitrer avec le DT. C&apos;est cette partie qualitative qui fait la différence.
        </p>
      </HelpSection>

      <HelpSection title="Soumettre">
        <p>
          Statut <strong>brouillon</strong> tant que tu travailles dessus. Bouton
          <strong> « Soumettre au DT »</strong> → bascule en <em>SUBMITTED</em>. Le DT le
          valide ou te le renvoie avec motif.
        </p>
      </HelpSection>

      <HelpSection title="Statuts">
        <p>
          <strong>Brouillon</strong> : modifiable · <strong>Soumis</strong> : verrouillé en
          attente DT · <strong>Validé</strong> : intégré au rapport mensuel DT · <strong>Refusé</strong> :
          retourné pour correction.
        </p>
      </HelpSection>

      <HelpTip>
        Soumets avant le <strong>5 du mois suivant</strong> — au-delà ton rapport rate la
        consolidation DT et donc le COMEX.
      </HelpTip>
    </>
  );
}
