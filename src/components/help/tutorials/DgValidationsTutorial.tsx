"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DgValidationsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Validations N3 du Directeur Général</strong> : niveau le plus haut du circuit
        d&apos;approbation. Tu signes les dossiers les plus stratégiques après passage par le N1
        (initiateur) et le N2 (DAF). Au-delà du seuil DG, la décision t&apos;est réservée.
      </p>

      <HelpSection title="Seuils typiques (configurables)">
        <ul className="ml-5 list-disc">
          <li><strong>Bons de commande</strong> : N3 obligatoire au-delà de 50 M FCFA.</li>
          <li><strong>Paie mensuelle</strong> : N3 obligatoire systématiquement.</li>
          <li><strong>Recrutement</strong> : N3 pour les cadres (≥ niveau VIII).</li>
          <li><strong>Contrats fournisseurs cadres</strong> : N3 obligatoire.</li>
          <li><strong>Garanties bancaires émises</strong> : N3 obligatoire.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Valider ou refuser">
        <HelpSteps>
          <li>Clique sur la ligne pour voir : pièce justificative, validation N1 + N2 (qui, quand, motif), impact budgétaire, écriture comptable préparée.</li>
          <li>Bouton <strong>« Approuver N3 »</strong> : tu signes — la décision devient effective.</li>
          <li>Bouton <strong>« Refuser »</strong> : motif obligatoire. Le dossier remonte au N2 pour info, ne s&apos;exécute pas.</li>
          <li>Bouton <strong>« Escalader au PCA »</strong> : pour les sujets de gouvernance qui dépassent ton mandat.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Toute validation N3 est <strong>journalisée</strong> (audit log + signature
        électronique). En cas de contrôle CAC ou DGI, ta validation est tracée. Ne valide
        jamais sans avoir lu la pièce.
      </HelpWarn>

      <HelpTip>
        Pour les <strong>rapports mensuels</strong> (DAF / DT / DTrav / QHSE), il y a des
        pages dédiées avec circuit spécifique. Cette page concerne les engagements et
        décisions opérationnelles.
      </HelpTip>
    </>
  );
}
