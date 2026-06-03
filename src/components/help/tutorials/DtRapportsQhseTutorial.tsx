"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtRapportsQhseTutorial() {
  return (
    <>
      <p className="mb-4">
        Liste des <strong>rapports mensuels QHSE</strong> à consulter et à valider. Depuis
        la création du rôle Responsable QHSE, c&apos;est lui qui rédige — toi tu consultes
        et tu peux remonter au DG pour signature.
      </p>

      <HelpSection title="Contenu d'un rapport mensuel QHSE">
        <ul className="ml-5 list-disc">
          <li><strong>Sinistralité</strong> : TF1, TG, jours sans accident, ventilation par type.</li>
          <li><strong>Audits</strong> : audits internes / externes du mois.</li>
          <li><strong>Non-conformités</strong> : ouvertes, fermées, critiques, en retard.</li>
          <li><strong>Formations sécurité</strong> : sessions, heures, personnes formées.</li>
          <li><strong>EPI</strong> : distribution, conformité.</li>
          <li><strong>Recommandations CHSCT</strong>.</li>
          <li><strong>Plan d&apos;action</strong>.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Workflow actuel">
        <p>
          <strong>QHSE_MANAGER</strong> rédige → soumet au <strong>DG</strong> → DG valide et
          signe. Le DT consulte en lecture seule (sauf cas de transition où il a encore
          accès historique).
        </p>
      </HelpSection>

      <HelpTip>
        Pour la gestion opérationnelle QHSE (incidents, NC, audits, certifs), va dans
        l&apos;espace <strong>Responsable QHSE</strong> ou la page QHSE de la DT
        (consultation).
      </HelpTip>
    </>
  );
}
