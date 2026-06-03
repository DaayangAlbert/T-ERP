"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravProfilTutorial() {
  return (
    <>
      <p className="mb-4">
        Ton espace personnel <strong>Directeur Travaux</strong> : préférences alertes,
        habilitations N1, agenda terrain, messagerie chantier.
      </p>

      <HelpSection title="Préférences alertes">
        <p>
          Seuils personnalisés au-delà desquels une alerte se déclenche : retard sur jalon,
          écart cadence, sur-conso matière, incident HSE. Canal préféré : push, email, in-app.
        </p>
      </HelpSection>

      <HelpSection title="Habilitations & pouvoir de signature">
        <p>
          Limite de signature N1 (petits achats, congés équipe). Liste des chantiers dont tu
          es <strong>Person In Charge</strong>. Au-delà de ton seuil, le dossier remonte
          automatiquement au DT.
        </p>
      </HelpSection>

      <HelpSection title="Agenda chantier">
        <p>
          Jalons MOA à venir, visites planifiées (BCT, MOA, inspection travail), réunions de
          chantier. Synchronisé avec les plannings de tous tes chantiers.
        </p>
      </HelpSection>

      <HelpSection title="Messagerie">
        <p>
          Groupes épinglés : équipe chantier, MOA, MOE, sous-traitants. Contacts externes
          rapides.
        </p>
      </HelpSection>

      <HelpTip>
        Pose tes congés ici via <strong>« Demande congé »</strong> — la demande remonte au
        DT pour validation (RBAC N2).
      </HelpTip>
    </>
  );
}
