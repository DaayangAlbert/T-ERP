"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function OuvCongesTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion de tes <strong>congés et absences</strong> : solde disponible, demandes
        en cours, historique.
      </p>

      <HelpSection title="Mon solde">
        <p>
          Jours acquis, jours pris, solde restant. Recalculé chaque mois selon ton
          ancienneté (Code du travail camerounais).
        </p>
      </HelpSection>

      <HelpSection title="Demander un congé">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle demande »</strong>.</li>
          <li>Date début + date fin.</li>
          <li>Motif (congé annuel, événement familial, formation, autre).</li>
          <li>Soumets → notifie le chef de chantier pour validation.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Statut">
        <p>
          <strong>En attente</strong> : le chef doit valider · <strong>Approuvé</strong> :
          tu peux partir · <strong>Refusé</strong> : motif fourni, revois ta demande
          avec le chef.
        </p>
      </HelpSection>

      <HelpTip>
        Anticipe au maximum (au moins 15 jours avant). Une demande de dernière minute
        peut être refusée pour cause de pic de production.
      </HelpTip>
    </>
  );
}
