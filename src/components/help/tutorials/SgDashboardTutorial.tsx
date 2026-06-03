"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function SgDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord du <strong>Secrétaire Général</strong> : gouvernance juridique,
        contentieux en cours, conformité réglementaire, courriers, marchés.
      </p>

      <HelpSection title="KPIs">
        <p>
          Contentieux actifs, courriers en attente de traitement, conformités à
          renouveler (statuts, attestations), marchés en cours.
        </p>
      </HelpSection>

      <HelpSection title="Alertes">
        <p>
          Délais légaux à respecter (dépôts OHADA, déclarations), expirations
          d&apos;attestations, audiences contentieux, échéances de conformité.
        </p>
      </HelpSection>

      <HelpSection title="Le SG, juriste de l&apos;entreprise">
        <p>
          Tu es le gardien de la conformité juridique : registres légaux, contentieux,
          conventions, gouvernance. Tu interviens en support de toutes les directions.
        </p>
      </HelpSection>

      <HelpTip>
        Mets en avant les délais légaux : le défaut de respect est une infraction OHADA
        ou une nullité d&apos;acte — coûteux en réputation et en argent.
      </HelpTip>
    </>
  );
}
