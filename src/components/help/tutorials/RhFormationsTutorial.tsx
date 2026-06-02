"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhFormationsTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion du <strong>plan de formation</strong> annuel : sessions à programmer, en cours,
        terminées, et suivi des <strong>certifications</strong> obligatoires (CACES, habilitations
        électriques, secouriste sauveteur du travail, etc.) avec leurs <strong>recyclages</strong>.
      </p>

      <HelpSection title="Onglets">
        <ul className="ml-5 list-disc">
          <li><strong>Plan annuel</strong> : ce qui est prévu cette année.</li>
          <li><strong>Sessions en cours</strong> : formations actuellement actives.</li>
          <li><strong>Certifications</strong> : suivi des validités CACES, électrique, etc.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Programmer une session">
        <HelpSteps>
          <li>Clique sur <strong>« Nouvelle session »</strong>.</li>
          <li>Type (CACES grue, électrique BR, secourisme, sécurité chantier…), date, durée, organisme, coût.</li>
          <li>Sélectionne les <strong>participants</strong> dans le personnel.</li>
          <li>Enregistre. Les salariés sont notifiés + le coût alimente la masse salariale.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi des certifications">
        <p>
          Onglet <strong>« Certifications »</strong> : pour chaque salarié certifié, la liste de
          ses habilitations + leurs dates de validité. Les certifications qui expirent dans
          <strong> moins de 60 jours</strong> apparaissent en orange ; expirées en rouge.
        </p>
        <HelpWarn>
          Une habilitation expirée = <strong>interdiction légale</strong> d&apos;utiliser le matériel
          concerné (grue, engins, équipements électriques). Programme le recyclage avant
          l&apos;échéance pour éviter l&apos;arrêt de chantier.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Clôturer une session">
        <p>
          À la fin de la formation, ouvre la session, marque chaque participant
          <strong> « Présent »</strong> ou <strong>« Absent »</strong>, joins l&apos;attestation
          PDF. Les certifications obtenues mettent automatiquement à jour la fiche du salarié.
        </p>
      </HelpSection>

      <HelpTip>
        Le coût total des formations s&apos;impute sur le poste comptable
        <strong> 6181 (Formation continue)</strong> et nourrit le rapport bilan social annuel.
      </HelpTip>
    </>
  );
}
