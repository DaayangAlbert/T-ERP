"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function AchatsDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord <strong>Achats</strong> : pilotage des bons de commande, suivi
        des fournisseurs, validation des demandes émises par les chantiers et directions.
      </p>

      <HelpSection title="KPIs">
        <p>
          BC en cours, BC à valider, valeur totale engagée sur la période, top
          fournisseurs, alertes (livraison en retard, fournisseur non conforme).
        </p>
      </HelpSection>

      <HelpSection title="Workflow BC">
        <p>
          Demande chantier → arbitrage Achats → BC émis → validation N+1 selon montant
          → bon envoyé fournisseur → livraison/réception → facture → paiement.
          Cette page te donne la vue globale de chaque étape.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Nouveau BC, sélection rapide d&apos;un fournisseur cadre, validation d&apos;un
          lot de BC en attente.
        </p>
      </HelpSection>

      <HelpTip>
        Toujours rattacher un BC à un <strong>chantier ou direction</strong> + un
        <strong> compte analytique</strong> — sinon impossible de calculer les marges.
      </HelpTip>
    </>
  );
}
