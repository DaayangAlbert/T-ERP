"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function MagEntreesTutorial() {
  return (
    <>
      <p className="mb-4">
        Saisir une <strong>entrée en stock</strong> (livraison fournisseur, retour
        chantier, transfert entre magasins).
      </p>

      <HelpSection title="Saisir une entrée">
        <HelpSteps>
          <li>Bouton <strong>« Nouvelle entrée »</strong>.</li>
          <li>Origine : Achats (BC), retour chantier, transfert, ajustement.</li>
          <li>Sélectionne les articles (catalogue) + quantité réelle reçue.</li>
          <li>Photo du BL fournisseur + n° BL.</li>
          <li>Réserves éventuelles (manquant, casse, qualité).</li>
          <li>Valider → alimente le stock, alimente la compta achats.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Réception sur BC Achats">
        <p>
          Si la livraison vient d&apos;un BC existant, T-ERP propose automatiquement les
          articles + quantités attendues. Tu n&apos;as qu&apos;à confirmer ou ajuster.
        </p>
      </HelpSection>

      <HelpSection title="Coût d&apos;entrée">
        <p>
          T-ERP recalcule le PMP (prix moyen pondéré) automatiquement après chaque
          entrée. Sert au calcul des sorties au coût réel.
        </p>
      </HelpSection>

      <HelpTip>
        Une entrée signée sans réserve déclenche le paiement du fournisseur. Vérifie deux
        fois les quantités et la qualité avant de signer.
      </HelpTip>
    </>
  );
}
