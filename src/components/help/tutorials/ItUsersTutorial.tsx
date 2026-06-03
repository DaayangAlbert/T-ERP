"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function ItUsersTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>utilisateurs</strong> du tenant : création, attribution de
        rôles, réinitialisation de mots de passe, désactivation.
      </p>

      <HelpSection title="Créer un utilisateur">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel utilisateur »</strong>.</li>
          <li>Nom, prénom, email professionnel, matricule.</li>
          <li>Rôle métier (DG, DAF, DT, CDT, CC, Ouvrier, etc.) — détermine les modules accessibles.</li>
          <li>Chantiers d&apos;affectation (pour les rôles terrain).</li>
          <li>Activer → mot de passe initial envoyé par email + SMS.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Modifier un utilisateur">
        <p>
          Tape sur une ligne → fiche détail. Tu peux modifier le rôle, les chantiers
          d&apos;affectation, désactiver le compte, forcer un changement de mot de passe.
        </p>
      </HelpSection>

      <HelpSection title="Désactivation vs suppression">
        <p>
          <strong>Désactive</strong> un utilisateur qui part (l&apos;historique est
          conservé). Ne <strong>supprime</strong> jamais — l&apos;intégrité des
          références (qui a saisi quoi) en dépend.
        </p>
      </HelpSection>

      <HelpWarn>
        Un utilisateur avec rôle DG ou Propriétaire a un pouvoir étendu : double-vérifie
        l&apos;identité avant attribution.
      </HelpWarn>

      <HelpTip>
        Quand un ouvrier change de chantier, mets à jour son affectation ici — sinon il
        ne pourra plus pointer sur le nouveau site.
      </HelpTip>
    </>
  );
}
