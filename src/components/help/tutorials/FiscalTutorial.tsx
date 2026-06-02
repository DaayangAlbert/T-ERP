"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function FiscalTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>échéances fiscales et sociales</strong> dans les 30 prochains jours :
        TVA, IRPP, CNPS (DIPE), CFC, IS (acompte/solde), DSF. Permet de <strong>déclarer</strong>
        puis <strong>payer</strong> chaque échéance.
      </p>

      <HelpWarn>
        Cette page est <strong>réservée au Comptable Direction</strong>. Un comptable chantier voit
        un écran cadenassé.
      </HelpWarn>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Type</strong> : nature de la taxe (TVA, IRPP, CNPS, IS, …).</li>
          <li><strong>Autorité</strong> : DGI, CNPS, Commune…</li>
          <li><strong>Période</strong> : mois ou trimestre concerné.</li>
          <li><strong>Échéance</strong> : date limite. Si dépassée, ligne en rouge avec le retard.</li>
          <li><strong>Montant</strong> : calculé en amont (pré-rempli sur la base des écritures TVA/CNPS).</li>
          <li><strong>Déclaration</strong> : À déclarer / Préparée / Déclarée / Acceptée / Rejetée.</li>
          <li><strong>Paiement</strong> : À payer / Programmé / Payée / En retard.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Étape 1 — Déclarer">
        <HelpSteps>
          <li>Pour une ligne en statut <strong>« À déclarer »</strong>, clique sur <strong>« Déclarer »</strong>.</li>
          <li>T-ERP passe la déclaration en <strong>SUBMITTED</strong>, génère un accusé interne.</li>
          <li>La soumission officielle à la DGI/CNPS reste à faire <strong>hors plateforme</strong> via leur téléprocédure.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Étape 2 — Payer">
        <HelpSteps>
          <li>Une fois déclarée, clique sur <strong>« Payer »</strong> en face de la ligne.</li>
          <li>T-ERP génère <strong>automatiquement</strong> l&apos;écriture comptable D 447x (impôts) / C 521 (banque) et passe le statut paiement à <strong>« Payée »</strong>.</li>
        </HelpSteps>
        <HelpWarn>
          L&apos;écriture est passée en compta même si l&apos;argent n&apos;a pas encore quitté la banque
          réelle. Vérifie que tu as bien émis le virement avant de cliquer.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>Total à payer (30 j)</strong> : enveloppe cash à provisionner.</li>
          <li><strong>En retard</strong> : nombre d&apos;échéances dépassées (rouge si &gt; 0).</li>
          <li><strong>À déclarer</strong> : combien attendent ta déclaration.</li>
          <li><strong>À payer</strong> : combien attendent le règlement.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Les <strong>échéances ne se créent pas ici</strong> — elles sont générées en amont (par
        cycle de paie pour CNPS/IRPP, par cycle TVA pour la TVA, etc.). Si une échéance manque,
        signale-le au DAF.
      </HelpTip>
    </>
  );
}
