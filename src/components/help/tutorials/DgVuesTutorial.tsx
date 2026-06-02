"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

/** Tutoriel partagé pour les vues condensées DG : vue-stocks, vue-logistique,
 *  vue-documentaire. Chacune offre une lecture exécutive d'un module métier
 *  sans rentrer dans le détail opérationnel. */
export function DgVuesTutorial({
  domaine = "Stocks",
}: {
  domaine?: "Stocks" | "Logistique" | "Documentaire";
}) {
  const detail =
    domaine === "Stocks"
      ? "valeur consolidée des stocks chantier, ruptures critiques, surstockage, articles inactifs"
      : domaine === "Logistique"
        ? "flotte engins, taux d'utilisation, immobilisations TP, locations actives, transferts inter-chantiers"
        : "volumétrie documentaire, statut des workflows obligatoires (qualité, conformité), archivage en retard";

  return (
    <>
      <p className="mb-4">
        <strong>Vue {domaine}</strong> : version <strong>exécutive condensée</strong> du
        module {domaine.toLowerCase()}. Pas de saisie ni d&apos;action, uniquement des KPI et
        alertes pour le pilotage stratégique.
      </p>

      <HelpSection title="Ce que tu y trouves">
        <p>{detail}.</p>
      </HelpSection>

      <HelpSection title="Lecture">
        <ul className="ml-5 list-disc">
          <li>KPI consolidés en haut.</li>
          <li>Alertes prioritaires (rouge / orange).</li>
          <li>Top des éléments à risque ou à pilotage.</li>
        </ul>
      </HelpSection>

      <HelpTip>
        Pour la gestion opérationnelle détaillée, passe par l&apos;espace
        <strong>
          {" "}
          {domaine === "Stocks"
            ? "Magasin"
            : domaine === "Logistique"
              ? "Logistique"
              : "Gestion Documentaire (GED)"}
        </strong>
        . Ici tu pilotes ; les opérations se font ailleurs.
      </HelpTip>
    </>
  );
}
