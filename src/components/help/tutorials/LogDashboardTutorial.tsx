"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function LogDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord <strong>Logistique</strong> : pilotage flotte, transferts
        inter-chantiers, bons de commande logistiques (carburant, location engins),
        fournisseurs logistiques.
      </p>

      <HelpSection title="KPIs">
        <p>
          Camions disponibles / en mission, transferts du jour, BC en cours, alertes
          (panne, contrôle technique expiré, assurance à renouveler).
        </p>
      </HelpSection>

      <HelpSection title="Alertes flotte">
        <p>
          Visites techniques expirées, contrôles tachygraphe, kilométrage de révision
          atteint, sinistres déclarés. Traite en priorité — un véhicule non conforme te
          coûte une immobilisation et une amende.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Nouveau transfert, nouveau BC carburant, signaler une panne, planifier un
          contrôle.
        </p>
      </HelpSection>

      <HelpTip>
        Pour la coordination quotidienne avec les chantiers, utilise la messagerie
        groupe logistique épinglée — pas le téléphone.
      </HelpTip>
    </>
  );
}
