"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

/** Tutoriel partagé par les 4 pages "Rapports XXX à valider" du DG :
 *  rapports-daf, rapports-dt, rapports-dtrav, rapports-qhse. */
export function DgRapportsValidationTutorial({ kind = "DAF" }: { kind?: "DAF" | "DT" | "DTrav" | "QHSE" }) {
  return (
    <>
      <p className="mb-4">
        File des <strong>rapports mensuels {kind}</strong> qui te sont soumis pour validation.
        Chaque rapport est rédigé par le responsable concerné puis envoyé au DG pour signature.
      </p>

      <HelpSection title="Les statuts">
        <ul className="ml-5 list-disc">
          <li><strong>Brouillon</strong> : en cours de rédaction côté auteur — non visible ici.</li>
          <li><strong>Soumis</strong> : auteur a validé son rapport, attend ta lecture.</li>
          <li><strong>Validé</strong> : tu as signé, le rapport est archivé et envoyé à la gouvernance (CA, CAC, PCA…).</li>
          <li><strong>Refusé</strong> : tu as renvoyé pour corrections, retour brouillon côté auteur.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Lire et valider un rapport">
        <HelpSteps>
          <li>Clique sur le rapport pour ouvrir la version complète : KPI, analyses, plans d&apos;action.</li>
          <li>Lis les sections clés : synthèse exécutive, alertes, recommandations.</li>
          <li>
            Bouton <strong>« Valider et signer »</strong> : tu approuves. T-ERP appose ta
            signature électronique, archive le PDF, notifie le PCA et le CAC.
          </li>
          <li>
            Bouton <strong>« Refuser »</strong> avec motif obligatoire : retour à l&apos;auteur
            avec tes remarques. Il corrige et te resoumet.
          </li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Télécharger le PDF">
        <p>
          Sur tout rapport validé, bouton <strong>« Télécharger PDF »</strong> : version
          archivable avec signature, cachet société, mention SYSCOHADA. Bon pour archivage
          interne et transmission externe.
        </p>
      </HelpSection>

      <HelpWarn>
        Une signature N3 sur un rapport est <strong>définitive</strong>. Pour corriger après
        coup, l&apos;auteur doit créer un <strong>rectificatif</strong> qui passe à son tour le
        circuit complet.
      </HelpWarn>

      <HelpTip>
        Cible : tout rapport mensuel signé <strong>avant le 15</strong> du mois suivant pour
        alimenter les revues CA et la communication externe.
      </HelpTip>
    </>
  );
}
