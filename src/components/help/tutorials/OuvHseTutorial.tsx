"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function OuvHseTutorial() {
  return (
    <>
      <p className="mb-4">
        Espace <strong>HSE</strong> : signaler un risque, déclarer un incident, voir
        les consignes de sécurité du chantier.
      </p>

      <HelpWarn>
        La sécurité, c&apos;est l&apos;affaire de chacun. Refuse une tâche dangereuse,
        signale un risque, porte tes EPI. Le chef ne pourra pas te le reprocher.
      </HelpWarn>

      <HelpSection title="Signaler un risque">
        <HelpSteps>
          <li>Bouton <strong>« Signaler un risque »</strong>.</li>
          <li>Type : matériel défectueux, EPI manquant, conditions dangereuses…</li>
          <li>Photo (si possible).</li>
          <li>Valider → notifie immédiatement le chef de chantier et le QHSE.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Déclarer un incident / blessure">
        <p>
          En cas d&apos;accident (même léger) : bouton <strong>« Déclarer un incident »</strong>.
          Décris ce qui s&apos;est passé. Si blessure, va voir le secouriste de chantier.
        </p>
      </HelpSection>

      <HelpSection title="Consignes du chantier">
        <p>
          Plan d&apos;Hygiène Sécurité (PHS) du chantier, fiches risques par poste,
          plan d&apos;évacuation. À consulter en cas de doute.
        </p>
      </HelpSection>

      <HelpTip>
        Un accident non déclaré dans les 24 h = pas de prise en charge CNPS. Déclare
        toujours, même si tu penses que ce n&apos;est pas grave.
      </HelpTip>
    </>
  );
}
