"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function AdminPromotionsTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Console plateforme — Promotions.</strong> Suivi des changements de
        rôle, évolutions de carrière, mutations entre filiales.
      </p>

      <HelpSection title="Demandes de promotion">
        <p>
          File des demandes émises par les RH ou les Directions : promotion interne,
          changement de filiale, élévation cadre, mutation. Statut : en attente,
          validée, refusée.
        </p>
      </HelpSection>

      <HelpSection title="Valider une promotion">
        <HelpSteps>
          <li>Tape sur une demande → fiche détail.</li>
          <li>Vérifie : ancienneté, évaluation, salaire proposé, justificatifs RH.</li>
          <li>Décide : <strong>Valider</strong> / <strong>Refuser</strong> / <strong>Demander complément</strong>.</li>
          <li>Une fois validée, l&apos;ancien et le nouveau rôle sont historisés ;
            l&apos;utilisateur conserve son historique.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Historique">
        <p>
          Pour chaque collaborateur, trace de toutes ses promotions / mutations / changements
          de rôle. Précieux pour les revues RH et la conformité juridique en cas de litige.
        </p>
      </HelpSection>

      <HelpWarn>
        Une promotion vers DG, DAF, PCA = décision Conseil. Demande de fiche au PCA
        avant d&apos;exécuter dans le système.
      </HelpWarn>

      <HelpTip>
        Croise toujours avec la masse salariale (DAF) : une vague de promotions peut
        impacter le ratio MS/CA et compromettre l&apos;équilibre financier.
      </HelpTip>
    </>
  );
}
