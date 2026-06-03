"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function MagInventairesTutorial() {
  return (
    <>
      <p className="mb-4">
        Réalisation des <strong>inventaires physiques</strong> du magasin : tournants
        (par catégorie) ou annuel complet.
      </p>

      <HelpSection title="Lancer un inventaire">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel inventaire »</strong>.</li>
          <li>Type : annuel (tout le magasin) ou tournant (catégorie/zone).</li>
          <li>Périmètre : articles concernés, date prévue.</li>
          <li>Bouton <strong>« Démarrer »</strong> → toute sortie est BLOQUÉE jusqu&apos;à clôture.</li>
        </HelpSteps>
      </HelpSection>

      <HelpWarn>
        Pendant un inventaire, le magasin est en mode <strong>verrouillé</strong>. Aucune
        sortie ni entrée non urgente ne doit être enregistrée. Préviens les chantiers
        24 h à l&apos;avance.
      </HelpWarn>

      <HelpSection title="Saisir les comptages">
        <p>
          Pour chaque article, saisis la quantité physique constatée. T-ERP affiche
          l&apos;écart vs stock théorique. Si écart important, recompte.
        </p>
      </HelpSection>

      <HelpSection title="Clôturer">
        <p>
          Bouton <strong>« Clôturer »</strong> → T-ERP génère les ajustements
          comptables (gains/pertes) et débloque le magasin. PDF récap envoyé à la DAF.
        </p>
      </HelpSection>

      <HelpTip>
        Un écart de plus de 5 % sur un article cher (ferraillage, équipement) =
        investigation obligatoire avant clôture. Vol, casse non déclarée, sortie non
        signée : remonte au DAF.
      </HelpTip>
    </>
  );
}
