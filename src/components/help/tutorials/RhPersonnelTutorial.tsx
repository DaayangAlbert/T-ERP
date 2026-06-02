"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RhPersonnelTutorial() {
  return (
    <>
      <p className="mb-4">
        Annuaire complet du <strong>personnel</strong> de la société. Liste, recherche, filtre,
        détail de chaque fiche : identité, contrat, paie, congés, formations.
      </p>

      <HelpSection title="Rechercher quelqu'un">
        <p>
          Barre de recherche en haut : tape le <strong>nom</strong>, le <strong>matricule</strong>
          ou le <strong>numéro CNPS</strong>. Filtres complémentaires : département, type de
          contrat, statut (Actif / Inactif / Suspendu).
        </p>
      </HelpSection>

      <HelpSection title="Ouvrir une fiche">
        <p>
          Clique sur une ligne pour ouvrir la <strong>fiche salarié</strong>. Tu y vois :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Identité</strong> : photo, CNI, date de naissance, situation familiale.</li>
          <li><strong>Contrat</strong> : type, dates, salaire, échelon, catégorie.</li>
          <li><strong>Affectation</strong> : chantier(s), équipe, responsable hiérarchique.</li>
          <li><strong>Historique</strong> : congés pris, formations, avances, disciplinaire.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Créer un nouveau salarié">
        <HelpSteps>
          <li>L&apos;ajout d&apos;un salarié se fait via <strong>« Contrats de travail » → Nouveau contrat</strong> (avec wizard CDD/CDI complet).</li>
          <li>Une fois le contrat créé, le salarié apparaît automatiquement ici.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Exporter">
        <p>
          Bouton <strong>« Exporter »</strong> en haut à droite : génère un CSV/Excel de la liste
          filtrée (Bilan social, états DGI, contrôles CNPS…).
        </p>
      </HelpSection>

      <HelpWarn>
        Les <strong>données personnelles</strong> de cette page sont sensibles (RGPD). Ne les
        partage pas par messagerie non sécurisée et n&apos;exporte que ce dont tu as besoin.
      </HelpWarn>

      <HelpTip>
        Le badge à côté du nom indique le <strong>statut du contrat</strong> (Actif = vert,
        Préavis = orange, Inactif = gris). Les contrats <strong>CDD échéant J+30</strong>
        apparaissent dans le dashboard RH en alerte.
      </HelpTip>
    </>
  );
}
