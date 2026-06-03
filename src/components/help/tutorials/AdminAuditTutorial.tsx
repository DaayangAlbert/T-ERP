"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function AdminAuditTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Console plateforme — Journal d&apos;audit.</strong> Trace exhaustive de
        toutes les actions sensibles : connexions, modifications, suppressions,
        attributions de rôles, exports de données.
      </p>

      <HelpSection title="Filtres">
        <p>
          Période, utilisateur, type d&apos;action (login, edit, delete, export, role
          change), entité ciblée (utilisateur, chantier, document, transaction),
          adresse IP, succès / échec.
        </p>
      </HelpSection>

      <HelpSection title="Cas d&apos;usage">
        <p>
          <strong>Investigation</strong> : retrouver qui a modifié une situation
          comptable. <strong>Audit externe</strong> : fournir au CAC la trace des
          modifications sur la période. <strong>Sécurité</strong> : identifier des
          tentatives de connexion anormales (IP inhabituelle, échecs répétés).
        </p>
      </HelpSection>

      <HelpSection title="Export">
        <p>
          Export horodaté et signé numériquement, avec hash d&apos;intégrité. Utilisable
          comme pièce probante en justice ou en audit externe.
        </p>
      </HelpSection>

      <HelpSection title="Rétention">
        <p>
          Le journal est conservé <strong>10 ans</strong> (durée légale OHADA pour les
          documents comptables). Aucune purge possible.
        </p>
      </HelpSection>

      <HelpTip>
        Le journal d&apos;audit est <strong>en lecture seule</strong>, même pour
        l&apos;administrateur. C&apos;est précisément cette immutabilité qui lui donne
        sa valeur probante.
      </HelpTip>
    </>
  );
}
