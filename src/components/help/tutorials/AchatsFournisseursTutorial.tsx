"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function AchatsFournisseursTutorial() {
  return (
    <>
      <p className="mb-4">
        Référentiel des <strong>fournisseurs</strong> de l&apos;entreprise : matières
        premières, équipements, prestations, sous-traitants.
      </p>

      <HelpSection title="Ajouter un fournisseur">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau fournisseur »</strong>.</li>
          <li>Raison sociale, NIU, RC, adresse, contact.</li>
          <li>Catégorie (matériaux, équipement, prestation, sous-traitance).</li>
          <li>Domiciliation bancaire (IBAN + nom banque).</li>
          <li>Conformité fiscale : attestation CNPS, DGI (à uploader, à renouveler annuellement).</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Contrat-cadre">
        <p>
          Pour les fournisseurs récurrents, négocie un contrat-cadre annuel : prix
          unitaires fixes, conditions de paiement, délais de livraison engagés.
          Bouton <strong>« Activer le contrat-cadre »</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Évaluation">
        <p>
          Note interne (1-5 étoiles) sur : ponctualité livraison, qualité, respect prix,
          réactivité. Mise à jour à chaque évaluation post-livraison. Sert aux futurs
          appels d&apos;offres.
        </p>
      </HelpSection>

      <HelpWarn>
        Ne jamais émettre un BC à un fournisseur sans attestation CNPS/DGI valide —
        risque de <strong>solidarité fiscale</strong> et blocage paiement.
      </HelpWarn>

      <HelpTip>
        Pour la diversification, vise au moins 3 fournisseurs actifs par catégorie
        critique (ciment, acier, transport). Pas de dépendance &gt; 50 % vis-à-vis
        d&apos;un seul.
      </HelpTip>
    </>
  );
}
