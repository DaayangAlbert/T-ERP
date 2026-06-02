"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhAvancesTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>avances sur salaire</strong>. Le salarié demande une avance, tu
        valides, le montant est retenu sur la paie du mois suivant (ou étalé).
      </p>

      <HelpSection title="Demandes en attente">
        <p>
          Liste des demandes des salariés avec : nom, montant demandé, motif (santé, scolarité,
          dépense imprévue…), justificatif éventuel, date demande.
        </p>
        <HelpSteps>
          <li>Clique sur la demande pour voir le détail + le solde de salaire restant du mois.</li>
          <li>Évalue : le salarié a-t-il déjà d&apos;autres avances en cours ? Le montant est-il raisonnable par rapport au salaire net ?</li>
          <li>
            <strong>Approuve</strong> avec, si tu veux, un <strong>étalement</strong> (ex : 100 000 FCFA sur 3 mois = 33 333 FCFA / mois).
          </li>
          <li><strong>Refuse</strong> avec motif si non éligible.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Effet d'une approbation">
        <ul className="ml-5 list-disc">
          <li>Le salarié est notifié.</li>
          <li>Le montant lui est versé (virement à passer en compta — D 421 / C 521).</li>
          <li>La retenue est inscrite automatiquement sur les paies des N prochains mois.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Suivi des avances en cours">
        <p>
          Onglet <strong>« En cours »</strong> : avances dont il reste un solde à rembourser.
          Visible par salarié, avec montant restant + nombre de mois restants.
        </p>
      </HelpSection>

      <HelpWarn>
        Le Code du travail camerounais limite les avances : <strong>retenue max = 1/3 du
        salaire net</strong>. T-ERP bloque les approbations qui dépassent ce seuil.
      </HelpWarn>

      <HelpTip>
        Une avance refusée peut être reformulée par le salarié avec un montant ou un motif
        différent — pas besoin de procédure spéciale.
      </HelpTip>
    </>
  );
}
