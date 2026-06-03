"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravApprosTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>approvisionnements matière</strong> du chantier : commandes en
        cours, livraisons attendues, ruptures, niveaux de stock dépôt.
      </p>

      <HelpSection title="Commandes en cours">
        <p>
          Liste des bons de commande émis pour le chantier : fournisseur, articles, quantité,
          date livraison prévue, statut (en attente, expédiée, livrée partiellement).
        </p>
      </HelpSection>

      <HelpSection title="Saisir une réception">
        <HelpSteps>
          <li>Sur la ligne de la livraison, clique <strong>« Réceptionner »</strong>.</li>
          <li>Renseigne la quantité effectivement reçue (peut être partielle).</li>
          <li>Photo du bon de livraison fournisseur.</li>
          <li>Si écart quantité ou qualité → coche <strong>« Réserve »</strong> + commentaire.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Demande d&apos;appro urgente">
        <p>
          Si rupture imminente : bouton <strong>« Demander un appro »</strong> → envoie une
          demande au magasinier + Achats avec niveau d&apos;urgence. Notifie également le DT.
        </p>
      </HelpSection>

      <HelpTip>
        Une livraison réceptionnée déclenche automatiquement la <strong>réception du BR</strong>
        côté Achats. Pas besoin de re-saisir.
      </HelpTip>
    </>
  );
}
