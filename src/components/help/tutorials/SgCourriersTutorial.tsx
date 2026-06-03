"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function SgCourriersTutorial() {
  return (
    <>
      <p className="mb-4">
        Registre des <strong>courriers entrants et sortants</strong> de l&apos;entreprise :
        chrono officiel, traçabilité, archivage.
      </p>

      <HelpSection title="Enregistrer un courrier entrant">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau courrier entrant »</strong>.</li>
          <li>Date de réception, expéditeur, objet, n° référence.</li>
          <li>Direction destinataire (DG, DAF, DT, etc.).</li>
          <li>Scan du courrier (PDF).</li>
          <li>Affecter au destinataire qui sera notifié.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Courrier sortant">
        <p>
          Bouton <strong>« Nouveau courrier sortant »</strong>. Idem pour les courriers
          émis par l&apos;entreprise. Numérotation chrono automatique.
        </p>
      </HelpSection>

      <HelpSection title="Suivi">
        <p>
          Statuts : reçu, en cours de traitement, traité, archivé. Tu peux relancer un
          destinataire si un courrier n&apos;est pas traité depuis &gt; 7 jours.
        </p>
      </HelpSection>

      <HelpTip>
        Tout courrier officiel (administration, MOA, contentieux) doit passer par ce
        registre. C&apos;est ce qui prouve la date de réception en cas de litige.
      </HelpTip>
    </>
  );
}
