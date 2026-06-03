"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function CdtSoustraitantsTutorial() {
  return (
    <>
      <p className="mb-4">
        Suivi des <strong>sous-traitants présents sur le chantier</strong> : effectif,
        avancement de leur lot, présence, qualité, conformité fiscale.
      </p>

      <HelpSection title="Liste sous-traitants">
        <p>
          Pour chaque sous-traitant : raison sociale, lot/ouvrage attribué, montant marché,
          avancement physique, note interne (sur 5 étoiles).
        </p>
      </HelpSection>

      <HelpSection title="Présence quotidienne">
        <p>
          Effectif sous-traitant pointé chaque jour. Indispensable pour facturation au
          réel et pour la responsabilité en cas d&apos;AT.
        </p>
      </HelpSection>

      <HelpSection title="Évaluer un sous-traitant">
        <p>
          Bouton <strong>« Évaluer »</strong> en fin de mission : note sécurité, qualité,
          respect délais, propreté chantier. Remonte au référentiel DT pour les futurs
          appels d&apos;offres.
        </p>
      </HelpSection>

      <HelpTip>
        Vérifie que la <strong>conformité fiscale</strong> (CNPS, DGI) est OK avant
        chaque mois — sinon le règlement est bloqué. Badge rouge = à vérifier d&apos;urgence
        avec les Achats.
      </HelpTip>
    </>
  );
}
