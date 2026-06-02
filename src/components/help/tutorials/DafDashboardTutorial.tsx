"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Page d&apos;accueil de l&apos;espace DAF. Vue stratégique : <strong>trésorerie</strong>,
        <strong> masse salariale</strong>, <strong>validations N2 en attente</strong>,
        <strong> alertes de risques</strong> (recouvrement, échéances fiscales, dépassements de
        budget).
      </p>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>Trésorerie consolidée</strong> : somme banques + caisses.</li>
          <li><strong>Recouvrement en attente</strong> : créances clients non encaissées (cf. page Recouvrement).</li>
          <li><strong>Engagements N2</strong> : validations urgentes à traiter aujourd&apos;hui.</li>
          <li><strong>Échéances 30 j</strong> : sorties cash prévues (fournisseurs + fiscal).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Alertes prioritaires">
        <p>
          Liste rouge/orange : factures fournisseurs échues, retenues fiscales en retard,
          situations clients impayées &gt; 60 j, dépassements budgétaires chantier.
        </p>
      </HelpSection>

      <HelpSection title="Validations N2 assignées">
        <p>
          Widget de raccourci : bons de commande, paie, dépenses qui attendent ta validation
          au niveau 2. Clique pour ouvrir directement la page Validations.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est <strong>en lecture seule</strong> — toutes les actions se font sur les
        pages spécialisées (Trésorerie, Validations, Recouvrement…).
      </HelpTip>
    </>
  );
}
