"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhPaieTutorial() {
  return (
    <>
      <p className="mb-4">
        Cycle de <strong>paie mensuel</strong> : tu prépares les bulletins, tu les contrôles, le DAF
        valide en N2 puis le DG en N3. La paie déclenche ensuite automatiquement les
        <strong> déclarations CNPS/IRPP/CFC</strong> côté fiscal.
      </p>

      <HelpSection title="Étape 1 — Créer le cycle du mois">
        <HelpSteps>
          <li>Vérifie que toutes les <strong>variables</strong> sont saisies : congés pris, absences, heures sup, primes, avances. Sans ça, les bulletins seront faux.</li>
          <li>Clique sur <strong>« Lancer la paie du mois »</strong> (bouton violet).</li>
          <li>T-ERP calcule automatiquement : salaire de base, indemnités, retenues CNPS / IRPP / CFC / mutuelle, net à payer.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Étape 2 — Contrôler les bulletins">
        <p>
          Une fois calculée, la paie apparaît avec son tableau de bulletins :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Brut</strong> : salaire + indemnités + heures sup.</li>
          <li><strong>Retenues salariales</strong> : CNPS (4,2 %), IRPP barème, CFC 1 %.</li>
          <li><strong>Net à payer</strong> : ce que le salarié reçoit.</li>
          <li><strong>Charges patronales</strong> : CNPS (16,2 %), CFC 1,5 %, FNE 1 %, AT (taux selon secteur).</li>
        </ul>
        <p>Clique sur un bulletin pour voir le détail ou <strong>l&apos;éditer</strong> (correction manuelle d&apos;une prime, etc.).</p>
      </HelpSection>

      <HelpSection title="Étape 3 — Soumettre à validation">
        <HelpSteps>
          <li>Quand tu es OK avec les bulletins, clique <strong>« Soumettre à la DAF »</strong>.</li>
          <li>Le cycle passe en statut <strong>« En validation N2 »</strong>. La DAF revoit puis valide.</li>
          <li>Le DG valide en N3 si le montant total dépasse le seuil.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Étape 4 — Émettre les bulletins">
        <p>
          Après validation finale, clique <strong>« Émettre »</strong> : T-ERP génère les PDF des
          bulletins individuels, les envoie automatiquement à chaque salarié (mail / espace
          personnel), et passe les écritures comptables D 64x (charges de personnel) / C 421
          (rémunérations dues) / C 431 (CNPS) / C 442 (IRPP).
        </p>
        <HelpWarn>
          Une fois <strong>émise</strong>, une paie ne peut plus être modifiée. Pour corriger, il
          faut une <strong>paie de rappel</strong> le mois suivant.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Sous-page « État du cycle »">
        <p>
          Clique sur un cycle pour voir son <strong>état détaillé</strong> : qui a validé quand,
          quelles corrections, quels bulletins ont été reçus par les salariés.
        </p>
      </HelpSection>

      <HelpTip>
        Bonne pratique : lance la paie autour du <strong>25 du mois</strong>, contrôle 2-3 jours,
        soumets pour validation le 28, vire les salaires le 1ᵉʳ.
      </HelpTip>
    </>
  );
}
