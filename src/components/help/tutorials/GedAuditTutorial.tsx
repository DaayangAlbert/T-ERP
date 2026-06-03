"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function GedAuditTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Journal d&apos;audit</strong> de la GED : trace exhaustive de toutes les
        actions (upload, lecture, modification, suppression, signature). Utilisé pour
        les contrôles, audits et investigations.
      </p>

      <HelpSection title="Filtres">
        <p>
          Période, utilisateur, action (lecture / écriture / suppression), document
          ciblé, espace, IP de connexion.
        </p>
      </HelpSection>

      <HelpSection title="Exemple d&apos;usage">
        <p>
          Un document a disparu : filtre par titre + action = SUPPRESSION → tu vois qui
          et quand. Suspicion de fuite : filtre par utilisateur + action = LECTURE sur
          la période sensible.
        </p>
      </HelpSection>

      <HelpSection title="Export">
        <p>
          Export Excel signé pour intégrité, utilisable comme pièce en justice ou en
          audit externe.
        </p>
      </HelpSection>

      <HelpTip>
        Le journal d&apos;audit est <strong>en lecture seule</strong>, même pour
        l&apos;admin. C&apos;est ce qui lui donne sa valeur probante.
      </HelpTip>
    </>
  );
}
