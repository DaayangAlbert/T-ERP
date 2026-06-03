"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DtravDocumentsTutorial() {
  return (
    <>
      <p className="mb-4">
        Tous les <strong>documents du chantier</strong> classés par catégorie : marché,
        plans, PV, HSE, attachements signés, photos, rapports.
      </p>

      <HelpSection title="Téléverser un document">
        <p>
          Bouton <strong>« Uploader »</strong> → glisser-déposer ou parcourir. Renseigner
          obligatoirement : titre, catégorie, référence (BL-XXX, OS-NN…), sous-catégorie si
          besoin. Le document est rattaché au chantier actif et visible immédiatement par le
          DT et la GED.
        </p>
      </HelpSection>

      <HelpSection title="Rechercher / filtrer">
        <p>
          Recherche par mot-clé sur titre ou référence. Filtres : catégorie, sous-catégorie,
          date. Aperçu PDF/image au survol.
        </p>
      </HelpSection>

      <HelpSection title="Catégories standard">
        <p>
          Marché · Plans EXE · Plans d&apos;atelier · PV de réception · PV chantier ·
          Attachements MOE · HSE (PHS, AT, inspections) · Photos · Rapports hebdo ·
          Correspondance MOA.
        </p>
      </HelpSection>

      <HelpTip>
        Un document classé ici est <strong>automatiquement remonté dans la GED groupe</strong>
        et accessible aux directions (DT, DAF, DG) avec les filtres adéquats.
      </HelpTip>
    </>
  );
}
