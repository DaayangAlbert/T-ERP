"use client";

import { HelpSection, HelpSteps, HelpTip } from "@/components/help/PageHelp";

export function MagCatalogueTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Catalogue articles</strong> du magasin : référence, désignation, unité,
        seuils, stock courant, fournisseurs.
      </p>

      <HelpSection title="Rechercher un article">
        <p>
          Recherche par code, désignation ou catégorie. Filtres : famille, fournisseur,
          niveau de stock (sous seuil mini).
        </p>
      </HelpSection>

      <HelpSection title="Ajouter un article">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel article »</strong>.</li>
          <li>Code unique + désignation + famille + unité (m, kg, u, l…).</li>
          <li>Seuil mini (déclenche l&apos;alerte), seuil maxi.</li>
          <li>Fournisseur(s) référencé(s) + prix d&apos;achat moyen.</li>
          <li>Photo (recommandé) + fiche technique PDF.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Modifier / désactiver">
        <p>
          Ne supprime jamais un article ayant un historique — désactive-le. Ainsi les
          mouvements passés restent traçables et le code n&apos;est pas réutilisable.
        </p>
      </HelpSection>

      <HelpTip>
        Un code article propre et unique = des sorties propres. N&apos;invente jamais un
        code sur le terrain : crée d&apos;abord la fiche, puis sors l&apos;article.
      </HelpTip>
    </>
  );
}
