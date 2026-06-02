"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DafEngagementsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>engagements financiers</strong> de la société : marchés clients,
        contrats-cadres fournisseurs, baux, emprunts, cautions bancaires, garanties.
        L&apos;objectif est d&apos;avoir une vue exhaustive du <strong>hors-bilan</strong>.
      </p>

      <HelpSection title="Types d'engagements suivis">
        <ul className="ml-5 list-disc">
          <li><strong>Marchés clients</strong> : CA cumulé restant à exécuter, garanties bancaires émises.</li>
          <li><strong>Contrats-cadres fournisseurs</strong> : enveloppes cadres, consommation, reste à utiliser.</li>
          <li><strong>Baux immobiliers</strong> : loyers cumulés restants jusqu&apos;à fin de bail.</li>
          <li><strong>Emprunts bancaires</strong> : capital restant dû, échéancier remboursement.</li>
          <li><strong>Cautions et garanties</strong> : montants cautionnés, dates de libération attendues.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Filtres et tri">
        <p>
          Filtre par type, par statut (Actif / Suspendu / Échu / Libéré), par tiers, ou par
          montant. Tri par échéance pour anticiper les renouvellements.
        </p>
      </HelpSection>

      <HelpSection title="Reporting consolidé">
        <p>
          KPI : montant total des engagements donnés, reçus, nets. Évolution sur 12 mois.
          Couverture par les fonds propres (= ratio classique de solvabilité).
        </p>
      </HelpSection>

      <HelpTip>
        Cette page nourrit le <strong>rapport au CAC</strong> annuel et le bilan provisoire. Tiens
        les engagements à jour, surtout en cas d&apos;avenant ou de libération de caution.
      </HelpTip>
    </>
  );
}
