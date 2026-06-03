"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function EmpCongesTutorial() {
  return (
    <>
      <p className="mb-4">
        Tes <strong>congés</strong> : solde, demandes, historique. Tout pour gérer ton
        temps de repos.
      </p>

      <HelpSection title="Mon solde">
        <p>
          Jours acquis, jours pris, solde disponible. Recalculé chaque mois selon ton
          ancienneté (Code du travail camerounais).
        </p>
      </HelpSection>

      <HelpSection title="Demander un congé">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle demande »</strong>.</li>
          <li>Date de début + date de fin.</li>
          <li>Motif (congé annuel, événement familial, formation, autre).</li>
          <li>Soumets → notifie ton chef de chantier ou ton manager direct.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi des demandes">
        <p>
          <strong>En attente</strong> : ton chef doit valider · <strong>Approuvé</strong> :
          tu peux partir · <strong>Refusé</strong> : motif fourni, revois avec le chef.
        </p>
      </HelpSection>

      <HelpTip>
        Anticipe au maximum (au moins 15 jours avant). Une demande de dernière minute
        peut être refusée si l&apos;équipe est en pic de production.
      </HelpTip>
    </>
  );
}
