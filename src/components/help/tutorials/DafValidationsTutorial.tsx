"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DafValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        File des <strong>validations N2</strong> qui te sont assignées : engagements
        d&apos;achats, dépenses, paie, virements. C&apos;est l&apos;étape financière du circuit
        d&apos;approbation entre l&apos;initiateur (N1) et le DG (N3).
      </p>

      <HelpSection title="Lecture de la file">
        <ul className="ml-5 list-disc">
          <li><strong>Référence + intitulé</strong> de la demande.</li>
          <li><strong>Type</strong> : Engagement BC, Paie, Virement bancaire, Avance, Engagement contrat…</li>
          <li><strong>Montant</strong> : seuil minimum pour la N2 = 500 000 FCFA par défaut.</li>
          <li><strong>Initiateur N1</strong> : qui a déjà validé en amont.</li>
          <li><strong>Âge</strong> : urgence — rouge si &gt; 5 j.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Valider ou refuser">
        <HelpSteps>
          <li>Clique sur une ligne pour voir le détail complet : pièce justificative, budget impacté, écriture comptable préparée par le comptable.</li>
          <li>Bouton <strong>« Approuver »</strong> (vert) : la demande passe à la N3 DG (si seuil) ou directement à exécution.</li>
          <li>Bouton <strong>« Refuser »</strong> (rouge) : avec motif obligatoire. La demande retourne à l&apos;initiateur.</li>
          <li>Bouton <strong>« Renvoyer pour info »</strong> : demande des compléments sans refuser.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Circuit complet">
        <p>
          Onglet <strong>« Circuit complet »</strong> : tu vois TOUT le pipeline (N1 → N2 → N3),
          pour suivre des dossiers que tu n&apos;as plus à valider toi-même.
        </p>
      </HelpSection>

      <HelpWarn>
        Toute validation N2 est <strong>journalisée</strong> (audit log) : qui a approuvé,
        quand, montant, motif éventuel. Ne valide pas sans avoir vérifié la pièce.
      </HelpWarn>

      <HelpTip>
        Cible : aucune validation ne reste &gt; 48 h sans réponse. Au-delà, tu reçois une
        notification de relance, et le dashboard DG fait apparaître l&apos;ancienneté.
      </HelpTip>
    </>
  );
}
