"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function CcLivraisonsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>livraisons matière</strong> attendues sur le chantier (béton,
        acier, agrégats, équipements).
      </p>

      <HelpSection title="Livraisons attendues">
        <p>
          Liste des livraisons prévues aujourd&apos;hui et J+1 : fournisseur, articles,
          quantité, créneau horaire. Couleur orange = imminente, rouge = en retard.
        </p>
      </HelpSection>

      <HelpSection title="Réceptionner une livraison">
        <HelpSteps>
          <li>À l&apos;arrivée du camion, tape <strong>« Réceptionner »</strong>.</li>
          <li>Vérifie les quantités → saisis ce qui est réellement reçu.</li>
          <li>Vérifie la qualité (apparence, conformité) → signale réserve si besoin.</li>
          <li>Photo du bon de livraison fournisseur (obligatoire).</li>
          <li>Signe numériquement → BL réceptionné, magasin alimenté.</li>
        </HelpSteps>
      </HelpSection>

      <HelpTip>
        Une livraison signée sans réserve déclenche le paiement du fournisseur. Si tu vois
        un défaut, signale la réserve immédiatement — pas le lendemain.
      </HelpTip>
    </>
  );
}
