"use client";

import { HelpSection, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function DafAchatsTutorial() {
  return (
    <>
      <p className="mb-4">
        Supervision financière des <strong>achats</strong> : bons de commande engagés,
        factures fournisseurs à payer, encours par fournisseur, alertes dépassement budget.
        Tu valides les engagements importants en N2.
      </p>

      <HelpSection title="Bons de commande engagés">
        <p>
          Liste des BC émis (statut APPROUVÉ), avec montant, fournisseur, chantier, et statut
          d&apos;avancement (livraison partielle, facturation, paiement). Tu vois si un BC
          dépasse l&apos;enveloppe budgétaire du chantier.
        </p>
      </HelpSection>

      <HelpSection title="Factures fournisseurs à payer">
        <p>
          Liste des factures comptabilisées et en attente de virement. Triée par date
          d&apos;échéance — les retards apparaissent en rouge. C&apos;est ici que tu programmes
          tes virements hebdomadaires.
        </p>
      </HelpSection>

      <HelpSection title="Encours par fournisseur">
        <p>
          Top 20 des fournisseurs par montant cumulé non payé. Permet d&apos;identifier les
          partenaires stratégiques (à ne pas froisser) et les concentrations de risque.
        </p>
      </HelpSection>

      <HelpSection title="Alertes budget chantier">
        <p>
          Chantiers où le cumul des BC dépasse 90 % du budget initial = orange ; au-delà de
          100 % = rouge. Échange avec le DT avant d&apos;autoriser de nouveaux engagements.
        </p>
      </HelpSection>

      <HelpWarn>
        Tu valides en N2 les <strong>BC &gt; 500 000 FCFA</strong>. Au-delà de 2 000 000 FCFA,
        c&apos;est aussi le DG en N3. Vérifie la pièce justificative (devis, expression de
        besoin) avant d&apos;approuver.
      </HelpWarn>

      <HelpTip>
        Pour la gestion opérationnelle des achats (création BC, suivi fournisseurs, contrats-cadres),
        passe par l&apos;espace <strong>Achats</strong> du Chargé des achats.
      </HelpTip>
    </>
  );
}
