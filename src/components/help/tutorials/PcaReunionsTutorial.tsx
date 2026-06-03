"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function PcaReunionsTutorial() {
  return (
    <>
      <p className="mb-4">
        Préparation et suivi des <strong>Conseils d&apos;Administration</strong> et
        Assemblées Générales : convocations, ordres du jour, PV, présences.
      </p>

      <HelpSection title="Convoquer une réunion">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle réunion »</strong>.</li>
          <li>Type (Conseil, AG ordinaire, AG extraordinaire) + date + lieu.</li>
          <li>Ordre du jour (préparé avec le DG / DAF).</li>
          <li>Liste des participants attendus.</li>
          <li>Envoie convocations + dossier préparatoire (PDF).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Pendant la réunion">
        <p>
          Émargement des présents, vote sur chaque résolution, prise des décisions.
          T-ERP enregistre tout pour générer le PV automatiquement.
        </p>
      </HelpSection>

      <HelpSection title="Après la réunion">
        <p>
          PV généré → relu et signé par le Président + Secrétaire de séance →
          dépôt OHADA + archivage GED. Décisions transmises aux opérationnels concernés.
        </p>
      </HelpSection>

      <HelpTip>
        Les délais légaux OHADA (convocation, dépôt PV) sont stricts. Respecte-les
        pour éviter la nullité des décisions.
      </HelpTip>
    </>
  );
}
