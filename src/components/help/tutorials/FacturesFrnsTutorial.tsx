"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function FacturesFrnsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>factures fournisseurs</strong> reçues, leur comptabilisation et leur
        paiement. Les factures arrivent ici depuis le module Achats (création BC + réception) ;
        toi tu les <strong>comptabilises</strong> puis tu les <strong>marques comme payées</strong>
        au règlement.
      </p>

      <HelpSection title="Les 5 onglets (statuts)">
        <ul className="ml-5 list-disc">
          <li><strong>À comptabiliser</strong> : factures reçues, en attente du 3-way matching (BC/réception/facture).</li>
          <li><strong>Comptabilisées</strong> : écriture passée, en attente de paiement.</li>
          <li><strong>À payer J+7</strong> : échéance dans la semaine — à anticiper.</li>
          <li><strong>En litige</strong> : écart de montant/quantité — à régler avec le fournisseur.</li>
          <li><strong>Payées</strong> : règlement effectué.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Comptabiliser une facture">
        <HelpSteps>
          <li>Va dans l&apos;onglet <strong>« À comptabiliser »</strong>.</li>
          <li>Trouve la facture (N°, fournisseur, montant TTC).</li>
          <li>Clique sur <strong>« Comptabiliser »</strong> à droite de la ligne.</li>
        </HelpSteps>
        <p className="text-[12.5px] text-ink-3">
          T-ERP génère automatiquement l&apos;écriture comptable (D 6xx ou 401, C 401 ou 521) en
          fonction du paramétrage fournisseur. La facture passe en statut <strong>« Comptabilisée »</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Marquer une facture comme payée">
        <HelpSteps>
          <li>Va dans l&apos;onglet <strong>« À payer J+7 »</strong> ou <strong>« Comptabilisées »</strong>.</li>
          <li>Clique sur <strong>« Marquer payée »</strong> en face de la facture.</li>
        </HelpSteps>
        <HelpWarn>
          Cette action déclenche l&apos;écriture de paiement (D 401 / C 521) côté banque. Vérifie
          que le règlement a réellement été émis avant de cliquer.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="KPI du haut">
        <ul className="ml-5 list-disc">
          <li><strong>À comptabiliser</strong> : combien attendent ton intervention.</li>
          <li><strong>Échéant J+7</strong> : combien sont à régler dans les 7 prochains jours (orange = urgence).</li>
          <li><strong>En litige</strong> : combien posent problème (rouge = à traiter).</li>
          <li><strong>Payées ce mois</strong> : indicateur de volume traité.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Le téléchargement du <strong>scan de la facture fournisseur</strong> n&apos;est pas encore
        possible depuis cette page — il arrive (Lot 3 Saisie unifiée).
      </HelpTip>
    </>
  );
}
