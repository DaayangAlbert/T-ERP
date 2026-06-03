"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function GedNomenclatureTutorial() {
  return (
    <>
      <p className="mb-4">
        Référentiel des <strong>catégories et sous-catégories de documents</strong> : la
        nomenclature qui structure le classement de toute la GED.
      </p>

      <HelpSection title="Catégories">
        <p>
          Exemples : Contrat, OS (Ordre de Service), PV de réunion, Plan EXE, Caution
          bancaire, Attestation fiscale, Avenant, Facture, Note de service…
        </p>
      </HelpSection>

      <HelpSection title="Sous-catégories">
        <p>
          Chaque catégorie peut avoir des sous-catégories. Ex. <em>Contrat</em> →
          travaux, fourniture, sous-traitance, prestation intellectuelle.
        </p>
      </HelpSection>

      <HelpSection title="Cycle de vie">
        <p>
          Pour chaque catégorie, on peut définir : durée de conservation légale,
          renouvellement automatique, alerte de péremption, signataires obligatoires.
        </p>
      </HelpSection>

      <HelpTip>
        Maintenir la nomenclature à jour est un travail continu. Quand un nouveau type
        de document apparaît (ex. attestation environnementale), ajoute-le tout de suite
        sinon les utilisateurs créeront des catégories « bricolées ».
      </HelpTip>
    </>
  );
}
