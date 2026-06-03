"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function GedWorkflowsTutorial() {
  return (
    <>
      <p className="mb-4">
        Workflows documentaires : <strong>signatures électroniques, validations,
        circulations</strong> de documents pour signature ou approbation.
      </p>

      <HelpSection title="Lancer un workflow">
        <HelpSteps>
          <li>Sur un document, bouton <strong>« Workflow »</strong>.</li>
          <li>Choisis le modèle (signature, validation, circulation).</li>
          <li>Saisis les signataires/validateurs dans l&apos;ordre.</li>
          <li>Délai par étape (facultatif).</li>
          <li>Démarrer → chaque destinataire est notifié à son tour.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivre">
        <p>
          Pour chaque workflow : statut, étape en cours, signataire en attente, délai
          dépassé. Tu peux relancer un signataire ou annuler.
        </p>
      </HelpSection>

      <HelpSection title="Signature électronique">
        <p>
          Le destinataire reçoit un email avec un lien sécurisé. Il consulte le
          document, signe avec un certificat numérique (ou par OTP SMS). La signature
          est horodatée et certifiée.
        </p>
      </HelpSection>

      <HelpTip>
        Pour les documents légalement contraignants (contrats, baux), privilégie la
        signature qualifiée (eIDAS niveau 2) — non la simple signature graphique.
      </HelpTip>
    </>
  );
}
