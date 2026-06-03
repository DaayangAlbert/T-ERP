"use client";

import { HelpSection, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function ItSettingsTutorial() {
  return (
    <>
      <p className="mb-4">
        Paramétrage <strong>technique du tenant</strong> : identité visuelle, devise,
        notifications, sécurité, sauvegarde.
      </p>

      <HelpSection title="Identité">
        <p>
          Nom, logo, couleurs primaires, slogan. S&apos;applique partout dans
          l&apos;application et sur les exports PDF (rapports, situations, paie).
        </p>
      </HelpSection>

      <HelpSection title="Devise & format">
        <p>
          Devise par défaut (FCFA), format de date (jj/mm/aaaa pour le Cameroun),
          fuseau horaire (Africa/Douala).
        </p>
      </HelpSection>

      <HelpSection title="Notifications">
        <p>
          Canaux disponibles : email, push (web/mobile), in-app, SMS. Configure ici les
          serveurs SMTP et fournisseurs SMS.
        </p>
      </HelpSection>

      <HelpSection title="Sécurité">
        <p>
          Politique mots de passe (longueur min, expiration), session timeout, 2FA,
          IP whitelist pour rôles sensibles.
        </p>
      </HelpSection>

      <HelpSection title="Sauvegardes">
        <p>
          Fréquence des backups, rétention, restauration manuelle. Programmées
          quotidiennement par défaut (3h du matin).
        </p>
      </HelpSection>

      <HelpWarn>
        Toute modification de paramètre sensible (mot de passe, 2FA, IP whitelist) doit
        être tracée dans le journal d&apos;audit et validée par le DG si elle affecte
        plusieurs utilisateurs.
      </HelpWarn>

      <HelpTip>
        Ne désactive jamais les backups, même temporairement — une perte de données
        compte parmi les pires incidents possibles.
      </HelpTip>
    </>
  );
}
