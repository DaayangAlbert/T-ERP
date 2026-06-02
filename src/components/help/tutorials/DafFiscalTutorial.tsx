"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DafFiscalTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue <strong>direction</strong> de la fiscalité : enveloppe à payer dans les 30 prochains
        jours, écheances en retard, suivi des paiements. Tu valides les déclarations et
        ordonnances les paiements ; le comptable opère.
      </p>

      <HelpSection title="Échéances 30 jours">
        <p>
          Liste de toutes les échéances : TVA, IRPP, CNPS/DIPE, IS, CFC, FNE, CAC, taxes
          communales, DSF. Statuts : à déclarer / déclarée / acceptée / rejetée pour la
          déclaration ; à payer / programmé / payée / en retard pour le paiement.
        </p>
      </HelpSection>

      <HelpSection title="Valider une déclaration">
        <p>
          Quand le comptable a préparé une déclaration TVA / DIPE / IRPP, elle apparaît en statut
          <strong> « Préparée »</strong>. Bouton <strong>« Valider »</strong> côté DAF
          → passe en <strong>« Déclarée »</strong> et autorise le paiement.
        </p>
      </HelpSection>

      <HelpSection title="Ordonner le paiement">
        <HelpSteps>
          <li>Sur une échéance en statut <strong>« À payer »</strong>, clique <strong>« Payer »</strong>.</li>
          <li>T-ERP génère l&apos;écriture comptable D 447x (impôts dus) / C 521 (banque).</li>
          <li>Émets le virement vers la DGI / CNPS depuis ta banque.</li>
          <li>L&apos;échéance passe en <strong>« Payée »</strong>.</li>
        </HelpSteps>
      </HelpSection>

      <HelpTip>
        Une <strong>échéance en retard</strong> = pénalité fiscale (10 % + intérêts). Programme
        toujours le paiement au plus tard <strong>3 jours ouvrés avant</strong> la date limite.
      </HelpTip>
    </>
  );
}
