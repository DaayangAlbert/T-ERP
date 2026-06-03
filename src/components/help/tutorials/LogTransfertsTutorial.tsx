"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function LogTransfertsTutorial() {
  return (
    <>
      <p className="mb-4">
        Organisation des <strong>transferts inter-chantiers</strong> : matériaux, engins,
        matériel, personnel.
      </p>

      <HelpSection title="Nouveau transfert">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau transfert »</strong>.</li>
          <li>Origine + destination (deux chantiers).</li>
          <li>Objet : articles + quantités, ou engin, ou groupe d&apos;ouvriers.</li>
          <li>Véhicule + conducteur affectés.</li>
          <li>Date prévue + heure de départ.</li>
          <li>Valider → notifie le CDT départ et arrivée.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi en temps réel">
        <p>
          Statuts : <em>planifié</em>, <em>en route</em>, <em>livré</em>. Le conducteur
          met à jour le statut depuis son téléphone. Le destinataire signe à l&apos;arrivée.
        </p>
      </HelpSection>

      <HelpSection title="Documents">
        <p>
          Bon de transfert généré automatiquement (PDF). Indispensable en cas de
          contrôle douanier ou de police sur la route.
        </p>
      </HelpSection>

      <HelpTip>
        Pour les matériaux, ce transfert déclenche automatiquement un mouvement de
        stock (sortie chantier A + entrée chantier B). Évite la double saisie.
      </HelpTip>
    </>
  );
}
