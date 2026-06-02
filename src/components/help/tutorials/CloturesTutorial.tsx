"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function CloturesTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Clôture mensuelle</strong> des périodes comptables. Une période clôturée
        n&apos;accepte plus aucune saisie ni validation d&apos;écriture — c&apos;est l&apos;outil
        clé pour <strong>geler les chiffres</strong> du mois et garantir que les états restent
        cohérents.
      </p>

      <HelpWarn>
        Action <strong>réservée au Comptable Direction / DAF</strong>. Une clôture est sérieuse —
        rien ne doit plus bouger sur la période après.
      </HelpWarn>

      <HelpSection title="Lecture du tableau (12 derniers mois)">
        <ul className="ml-5 list-disc">
          <li><strong>Période</strong> : mois (« Mai 2026 »).</li>
          <li><strong>Écritures</strong> : nombre saisi sur le mois.</li>
          <li><strong>Débit / Crédit</strong> : totaux cumulés.</li>
          <li><strong>Équilibre</strong> : vert si D = C, rouge si écart.</li>
          <li><strong>Statut</strong> : Ouverte / Clôturée / Verrouillée.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Clôturer une période">
        <HelpSteps>
          <li>Va sur la ligne du mois à clôturer (généralement le mois précédent, après que toutes les écritures soient passées).</li>
          <li>Vérifie que la période est <strong>équilibrée</strong> (« ✓ équilibré » vert). Sinon corrige d&apos;abord les déséquilibres dans la <strong>Saisie d&apos;écritures</strong> ou le <strong>Grand livre</strong>.</li>
          <li>Clique sur le bouton violet <strong>« Clôturer »</strong>.</li>
          <li>Confirme dans la pop-up. Le statut passe à <strong>« Clôturée »</strong>.</li>
        </HelpSteps>
        <HelpWarn>
          Le bouton <strong>« Clôturer »</strong> est grisé si la période n&apos;est pas équilibrée
          ou si elle n&apos;a aucune écriture. T-ERP refuse de clôturer un mois déséquilibré.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Effets d'une clôture">
        <ul className="ml-5 list-disc">
          <li>Plus aucune <strong>saisie</strong> n&apos;est possible sur le mois (erreur 409).</li>
          <li>Plus aucune <strong>validation</strong> de brouillard n&apos;est possible.</li>
          <li>Les <strong>écritures récurrentes</strong> et la <strong>contrepassation</strong> sont également refusées sur cette période.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Rouvrir une période">
        <p>
          Sur une période <strong>Clôturée</strong>, le bouton <strong>« Rouvrir »</strong>
          apparaît. La réouverture remet le statut à <strong>Ouverte</strong> et autorise à
          nouveau toute opération sur la période.
        </p>
        <HelpWarn>
          Réserve la réouverture aux <strong>cas exceptionnels</strong> (oubli avéré, demande
          du DAF). Tout réouvrir/clôturer trop souvent perd l&apos;intérêt de la clôture.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Statut « Verrouillée »">
        <p>
          Statut prévu pour les <strong>années fiscales définitivement closes</strong> (au-delà de
          la simple clôture mensuelle). Aucune action UI ne le déclenche pour l&apos;instant — c&apos;est
          un statut administratif réservé aux interventions DAF/DG si besoin.
        </p>
      </HelpSection>

      <HelpTip>
        Bonne pratique : <strong>clôturer le mois précédent</strong> dans la première semaine du
        mois en cours, après que toutes les factures et paiements aient été saisis.
      </HelpTip>
    </>
  );
}
