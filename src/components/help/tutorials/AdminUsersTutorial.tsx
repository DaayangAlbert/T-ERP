"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function AdminUsersTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Console plateforme — Utilisateurs.</strong> Gestion globale des comptes
        du tenant, attribution des rôles et habilitations sensibles.
      </p>

      <HelpSection title="Liste des utilisateurs">
        <p>
          Tous les comptes du tenant avec : email, rôle, statut (actif/inactif/verrouillé),
          dernière connexion, MFA activé ou non, chantiers d&apos;affectation.
        </p>
      </HelpSection>

      <HelpSection title="Créer un compte">
        <HelpSteps>
          <li>Bouton <strong>« Nouvel utilisateur »</strong>.</li>
          <li>Identité (nom, prénom, email, téléphone, matricule).</li>
          <li>Rôle métier — détermine les modules accessibles via la matrice RBAC.</li>
          <li>Affectations (chantiers, direction).</li>
          <li>Mot de passe initial envoyé par email/SMS, expiration à la 1ère connexion.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Actions sur un compte">
        <p>
          Réinitialiser mot de passe · forcer MFA · verrouiller · changer le rôle ·
          mettre à jour les affectations · désactiver (jamais supprimer).
        </p>
      </HelpSection>

      <HelpWarn>
        Toute attribution de rôle DG, PCA ou TENANT_ADMIN doit être tracée dans le
        journal d&apos;audit avec motif et signature du DG/Propriétaire.
      </HelpWarn>

      <HelpTip>
        Désactive plutôt que de supprimer — les références (qui a créé, validé, signé)
        deviendraient orphelines, compromettant l&apos;audit comptable et juridique.
      </HelpTip>
    </>
  );
}
