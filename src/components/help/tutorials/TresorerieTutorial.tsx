"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function TresorerieTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>caisses chantier</strong> (entrées/sorties d&apos;espèces) et
        consultation des <strong>banques</strong>. Le rapprochement bancaire détaillé se fait
        sur la page dédiée <em>« Rapprochement bancaire »</em>.
      </p>

      <HelpSection title="Onglet « Caisses chantiers »">
        <p>
          Liste de toutes les caisses configurées. Pour chacune : solde et 5 derniers mouvements.
        </p>
        <p><strong>Enregistrer une entrée de caisse</strong> :</p>
        <HelpSteps>
          <li>Clique sur le bouton vert <strong>« Entrée »</strong> en face de la caisse concernée.</li>
          <li>Saisis le <strong>montant</strong>, un <strong>motif</strong> (ex : « Remboursement avance Paul »), une <strong>référence pièce</strong> (n° du reçu).</li>
          <li>Enregistre. Le mouvement apparaît dans la liste et le solde se met à jour.</li>
        </HelpSteps>
        <p><strong>Enregistrer une sortie</strong> : même chose avec le bouton rouge <strong>« Sortie »</strong>.</p>
        <HelpWarn>
          La caisse <strong>n&apos;accepte pas de justificatif joint</strong> ici. Pour une dépense
          qui nécessite une pièce, passe par <strong>Saisie d&apos;écritures</strong> (modèle
          « Dépense caisse ») où tu peux uploader la facture.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Onglet « Banques » (Comptable Direction uniquement)">
        <p>
          Liste des comptes bancaires : nom de la banque, numéro de compte, type, solde. Lecture
          seule ici — pour saisir un mouvement bancaire, va dans <strong>Saisie d&apos;écritures</strong>
          (modèle « Encaissement » ou « Dépense »).
        </p>
      </HelpSection>

      <HelpSection title="Onglet « Rapprochements »">
        <p>
          Renvoie vers la page dédiée <strong>« Rapprochement bancaire »</strong> où tu peux
          importer un relevé CSV et pointer les mouvements.
        </p>
      </HelpSection>

      <HelpTip>
        Les soldes affichés ici sont <strong>les soldes comptables</strong> (issus des écritures
        passées). En cas d&apos;écart avec le relevé bancaire réel, fais un rapprochement.
      </HelpTip>
    </>
  );
}
