"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function MagSortiesTutorial() {
  return (
    <>
      <p className="mb-4">
        Enregistrer une <strong>sortie de stock</strong> : livraison à un chantier,
        consommation interne, casse, transfert.
      </p>

      <HelpSection title="Sur demande chantier">
        <HelpSteps>
          <li>Depuis la file <strong>« Demandes »</strong>, choisis une demande validée.</li>
          <li>Bouton <strong>« Préparer »</strong> → liste des articles à sortir.</li>
          <li>Quantité réelle servie (peut être inférieure si rupture).</li>
          <li>Signature numérique du destinataire (chef de chantier).</li>
          <li>Valider → stock décrémenté, sortie tracée.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Sortie hors demande">
        <p>
          Bouton <strong>« Nouvelle sortie »</strong> → motif obligatoire (consommation
          interne, casse, transfert). À éviter sauf cas exceptionnel — passe d&apos;abord
          par une demande pour garder la traçabilité.
        </p>
      </HelpSection>

      <HelpSection title="Stock insuffisant">
        <p>
          Si le stock ne couvre pas la demande, T-ERP propose : sortie partielle (sert
          ce qui est dispo) ou refus. Notifie automatiquement le demandeur et déclenche
          une alerte d&apos;appro.
        </p>
      </HelpSection>

      <HelpTip>
        Pas de sortie sans signature du destinataire — c&apos;est ce qui te protège en
        cas de contestation ultérieure.
      </HelpTip>
    </>
  );
}
