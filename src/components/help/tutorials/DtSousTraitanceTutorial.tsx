"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DtSousTraitanceTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>sous-traitants techniques</strong> : agrément, qualification,
        suivi de leurs interventions par chantier, évaluation de leur performance,
        renouvellement / déréférencement.
      </p>

      <HelpSection title="Annuaire des sous-traitants">
        <p>
          Pour chaque ST : raison sociale, NIU/RCCM, spécialité (terrassement, étanchéité,
          électricité, …), agrément BTP, références chantiers, contact, score de
          performance.
        </p>
      </HelpSection>

      <HelpSection title="Agréer un nouveau ST">
        <HelpSteps>
          <li>Bouton <strong>« Nouveau sous-traitant »</strong>.</li>
          <li>Identité, spécialité, justificatifs (NIU, RCCM, attestation CNPS, agrément BTP, assurance RC professionnelle).</li>
          <li>Validation N3 par le DG si agrément stratégique.</li>
          <li>Le ST devient sélectionnable lors de la création d&apos;un BC de sous-traitance.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Suivi par chantier">
        <p>
          Pour chaque chantier en cours, liste des ST intervenants : montant marché ST,
          avancement, factures reçues, retenues garantie, conformité documentaire (PGC,
          accueil sécurité).
        </p>
      </HelpSection>

      <HelpSection title="Évaluation">
        <p>
          À la fin de chaque chantier, le DTrav / CDT note le ST sur Qualité, Délai,
          Sécurité, Comportement. La moyenne alimente le score affiché dans l&apos;annuaire.
        </p>
      </HelpSection>

      <HelpWarn>
        Un ST avec un score &lt; 2/5 ou un incident grave est automatiquement signalé pour
        <strong> déréférencement</strong>. À traiter en revue ST trimestrielle.
      </HelpWarn>

      <HelpTip>
        Le suivi <strong>financier</strong> du ST (engagements, paiements, retenues) se fait
        dans l&apos;espace Achats / DAF.
      </HelpTip>
    </>
  );
}
