"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function ProfilTransverseTutorial() {
  return (
    <>
      <p className="mb-4">
        Espace <strong>Mon Profil transverse</strong> — pour tous les cadres et
        utilisateurs ayant un rôle métier. Préférences personnelles, sécurité, sessions.
      </p>

      <HelpSection title="Mes informations">
        <p>
          Nom, prénom, email professionnel, téléphone, fonction, photo. La photo
          s&apos;affiche dans toute l&apos;application (header, annuaire, signatures
          électroniques).
        </p>
      </HelpSection>

      <HelpSection title="Sécurité">
        <p>
          Changer mon mot de passe, activer/désactiver le MFA (à deux facteurs), voir
          mes dernières connexions.
        </p>
      </HelpSection>

      <HelpSection title="Préférences">
        <p>
          Notifications (email, push, in-app), langue, fuseau horaire, format de date.
        </p>
      </HelpSection>

      <HelpSection title="Sessions actives">
        <p>
          Liste de tes sessions ouvertes (web, mobile). Tu peux les déconnecter en cas
          de doute (vol de téléphone, ordinateur partagé).
        </p>
      </HelpSection>

      <HelpTip>
        Active le <strong>MFA</strong> si tu as un rôle sensible (DG, DAF, PCA,
        TENANT_ADMIN) — c&apos;est ta meilleure protection contre le vol de compte.
      </HelpTip>
    </>
  );
}
