"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function ComptesProjetsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>sous-comptes bancaires dédiés à chaque chantier</strong>. Chaque chantier
        a son compte projet alimenté depuis une banque puis utilisé pour ses dépenses. Le solde
        négatif = découvert/dette envers la banque source.
      </p>

      <HelpSection title="Lecture du tableau">
        <ul className="ml-5 list-disc">
          <li><strong>Chantier</strong> : nom et code du chantier.</li>
          <li><strong>Banque</strong> : compte bancaire de rattachement.</li>
          <li><strong>Solde dispo.</strong> : montant restant utilisable.</li>
          <li><strong>Dette</strong> : total approvisionné − total remboursé. Tant qu&apos;il est positif, la banque attend remboursement.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Enregistrer une dépense (côté comptable chantier)">
        <HelpSteps>
          <li>Sur la ligne du chantier concerné, clique <strong>« Mouvt. »</strong>.</li>
          <li>Choisis le type : <strong>« Dépense (débit) »</strong>.</li>
          <li>Saisis le montant + le motif (ex : « achat ciment »).</li>
          <li>Enregistre. Le solde dispo du compte projet diminue.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Enregistrer une recette (encaissement chantier)">
        <p>
          Même chose, mais choisis le type <strong>« Production / encaissement (crédit) »</strong>.
          Le solde dispo augmente.
        </p>
      </HelpSection>

      <HelpSection title="Régularisation (correction)">
        <p>
          Si une dépense a été saisie avec le mauvais montant et qu&apos;il n&apos;y a pas d&apos;impact
          banque réel, utilise <strong>« Mouvt. → Régularisation »</strong>. Sens DEBIT pour
          réduire le solde, CREDIT pour l&apos;augmenter.
        </p>
        <HelpWarn>
          Si l&apos;argent a réellement bougé entre le compte projet et la banque, demande au DAF
          de faire un <strong>« Remboursement banque »</strong> à la place (action réservée DAF).
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Relevé d'un compte projet">
        <p>
          Clique sur l&apos;œil <strong>« Relevé »</strong> en bout de ligne : tu vois tous les
          mouvements (entrées et sorties) avec leur solde après opération. Pratique pour expliquer
          au chef de chantier où est passé l&apos;argent.
        </p>
      </HelpSection>

      <HelpTip>
        Seul le DAF peut <strong>créer</strong> un compte projet, l&apos;<strong>approvisionner</strong>
        depuis une banque, ou faire un <strong>remboursement</strong>. Toi tu utilises et corriges
        à la marge.
      </HelpTip>
    </>
  );
}
