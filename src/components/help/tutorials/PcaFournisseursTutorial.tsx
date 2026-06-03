"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function PcaFournisseursTutorial() {
  return (
    <>
      <p className="mb-4">
        Vue consolidée des <strong>fournisseurs groupe</strong> : référentiel,
        engagements financiers, dépendance, conformité.
      </p>

      <HelpSection title="Top fournisseurs">
        <p>
          Classement par volume d&apos;achats sur 12 mois. Identifie les fournisseurs
          stratégiques (top 20 = 80 % des achats).
        </p>
      </HelpSection>

      <HelpSection title="Dépendance">
        <p>
          Part de chaque fournisseur dans nos achats totaux. Un fournisseur représentant
          &gt; 15 % des achats d&apos;une catégorie clé = risque de dépendance à diversifier.
        </p>
      </HelpSection>

      <HelpSection title="Conformité">
        <p>
          État CNPS / DGI des principaux fournisseurs. Un fournisseur non conforme nous
          expose à la solidarité fiscale (Code général des impôts).
        </p>
      </HelpSection>

      <HelpTip>
        La sécurisation des approvisionnements stratégiques (ciment, acier, carburant)
        est une décision de Conseil — protège-toi par des contrats-cadres pluriannuels.
      </HelpTip>
    </>
  );
}
