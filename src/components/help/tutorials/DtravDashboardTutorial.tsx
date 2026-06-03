"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function DtravDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Point d&apos;entrée terrain du <strong>Directeur Travaux</strong> sur le chantier
        actif. Sélectionne ton chantier en haut (sélecteur) puis pilote la journée.
      </p>

      <HelpSection title="Bandeau d&apos;état du chantier">
        <p>
          Ligne d&apos;information en haut : phase en cours, MOA, avancement physique global,
          jours restants théoriques, alertes ouvertes. Couleur verte = sain, orange = à
          surveiller, rouge = critique.
        </p>
      </HelpSection>

      <HelpSection title="KPIs du jour">
        <p>
          Tuiles : <strong>équipes présentes</strong>, <strong>cadence</strong> (m³/m²/jour),
          <strong> consommation matière</strong>, <strong>incidents 24 h</strong>. Cliquer une
          tuile zoome sur la page détaillée correspondante.
        </p>
      </HelpSection>

      <HelpSection title="Alertes chantier">
        <p>
          Liste consolidée : rupture appro, retard sur jalon, incident HSE non clos, NC
          qualité. Clic → fiche détail + action immédiate (relancer fournisseur, signaler
          au DT, etc.).
        </p>
      </HelpSection>

      <HelpSection title="Activité du jour">
        <HelpSteps>
          <li>Frise chronologique des événements terrain depuis 6 h : pointages, livraisons, attachements signés, photos uploadées.</li>
          <li>Permet de reconstituer la journée et de rédiger le rapport hebdo.</li>
        </HelpSteps>
      </HelpSection>

      <HelpTip>
        Tu peux changer de chantier à tout moment (sélecteur en haut) — toutes les pages du
        module suivent automatiquement le chantier actif.
      </HelpTip>
    </>
  );
}
