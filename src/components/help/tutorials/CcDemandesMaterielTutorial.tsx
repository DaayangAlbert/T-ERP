"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcDemandesMaterielTutorial() {
  return (
    <>
      <p className="mb-4">
        Émettre une <strong>demande de matériel</strong> au magasin du chantier ou au
        magasin central (consommables, outillage, EPI, petit équipement).
      </p>

      <HelpSection title="Nouvelle demande">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle demande »</strong>.</li>
          <li>Choisis les articles (catalogue magasin).</li>
          <li>Quantité + justification (chantier, lot, urgence).</li>
          <li>Valide → notifie le magasinier.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi">
        <p>
          Statut : en attente, préparée, livrée. À réception, vérifie + signe numériquement.
          Si manquant, signale via <strong>« Réserves »</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Demandes récurrentes">
        <p>
          Pour les consommables hebdomadaires (gants, casques de remplacement…), tu peux
          enregistrer un modèle <strong>« Demande type »</strong> à dupliquer.
        </p>
      </HelpSection>

      <HelpTip>
        Anticipe : une demande déposée le matin est généralement livrée l&apos;après-midi.
        Les demandes urgentes (badge rouge) sont traitées dans la journée.
      </HelpTip>
    </>
  );
}
