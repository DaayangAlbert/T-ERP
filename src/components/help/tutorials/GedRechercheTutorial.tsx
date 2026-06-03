"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function GedRechercheTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Moteur de recherche</strong> de la GED : recherche full-text dans les
        titres, références, contenus de PDF indexés.
      </p>

      <HelpSection title="Recherche simple">
        <p>
          Tape un mot-clé. Recherche tous les documents contenant ce mot dans titre,
          référence ou contenu PDF. Résultats triés par pertinence et date.
        </p>
      </HelpSection>

      <HelpSection title="Recherche avancée">
        <p>
          Combine plusieurs critères : espace, catégorie, période, auteur, signataire,
          mots-clés. Idéal pour retrouver un document précis quand on connaît quelques
          attributs.
        </p>
      </HelpSection>

      <HelpSection title="Opérateurs">
        <p>
          Guillemets pour une expression exacte (<em>« note de service N°12 »</em>).
          Tiret pour exclure (<em>contrat -avenant</em>). Astérisque pour préfixe
          (<em>caut*</em>).
        </p>
      </HelpSection>

      <HelpTip>
        Si tu ne trouves rien, vérifie d&apos;abord que tu as les droits d&apos;accès à
        l&apos;espace concerné. Sinon, raffine en élargissant la fourchette de dates.
      </HelpTip>
    </>
  );
}
