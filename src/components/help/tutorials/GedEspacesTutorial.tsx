"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function GedEspacesTutorial() {
  return (
    <>
      <p className="mb-4">
        Configuration des <strong>espaces documentaires</strong> : grands tiroirs
        thématiques (Marchés, RH, Comptable, Chantiers, Juridique, QSE, IT…).
      </p>

      <HelpSection title="Liste des espaces">
        <p>
          Pour chaque espace : code, libellé, propriétaire (direction), nombre de
          documents, permissions par rôle.
        </p>
      </HelpSection>

      <HelpSection title="Créer un espace">
        <p>
          Réservé à l&apos;Administrateur GED. Définir : code court, libellé, direction
          propriétaire, qui peut <em>lire</em>, qui peut <em>déposer</em>, qui peut
          <em> supprimer</em>.
        </p>
      </HelpSection>

      <HelpSection title="Permissions">
        <p>
          Le RBAC GED est plus fin que le RBAC global : on peut, par exemple, donner
          l&apos;accès en lecture seule à la Direction Générale sur l&apos;espace RH.
        </p>
      </HelpSection>

      <HelpTip>
        Limite les espaces à 15-20 max. Au-delà, les utilisateurs s&apos;y perdent. Les
        sous-catégories servent à structurer dans chaque espace.
      </HelpTip>
    </>
  );
}
