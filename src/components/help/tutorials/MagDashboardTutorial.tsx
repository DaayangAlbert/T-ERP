"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function MagDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord du <strong>Magasinier</strong> : niveaux de stock, demandes en
        attente, entrées/sorties du jour, alertes ruptures.
      </p>

      <HelpSection title="KPIs">
        <p>
          Valeur stock total, articles en rupture, demandes en attente, livraisons
          attendues. Cliquer une tuile zoome sur la page détaillée.
        </p>
      </HelpSection>

      <HelpSection title="Alertes">
        <p>
          Article sous le seuil mini, péremption proche, demande urgente non traitée.
          Triées par criticité.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Boutons d&apos;accès direct : enregistrer une entrée, préparer une sortie,
          ouvrir une demande, lancer un inventaire.
        </p>
      </HelpSection>

      <HelpTip>
        Le sélecteur d&apos;entrepôt en haut filtre les pages. Si tu gères plusieurs
        magasins (central + chantiers), change-le pour basculer entre eux.
      </HelpTip>
    </>
  );
}
