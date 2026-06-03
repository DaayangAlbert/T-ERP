"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function ItDashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Tableau de bord <strong>IT / Informatique</strong> : pilotage technique du
        tenant — utilisateurs, sites, paramètres, intégrations, change requests.
      </p>

      <HelpSection title="KPIs">
        <p>
          Utilisateurs actifs, sessions ouvertes, change requests en cours, intégrations
          actives, dernier backup, taux de disponibilité de la plateforme.
        </p>
      </HelpSection>

      <HelpSection title="Alertes techniques">
        <p>
          Erreurs récurrentes, intégration en échec, configuration manquante,
          utilisateur non rattaché à un chantier, mots de passe expirant.
        </p>
      </HelpSection>

      <HelpSection title="Actions rapides">
        <p>
          Créer un utilisateur, ouvrir une change request, vérifier l&apos;état des
          intégrations, consulter le journal d&apos;audit.
        </p>
      </HelpSection>

      <HelpTip>
        Le rôle IT est le bras opérationnel de la DSI : tu paramètres, tu dépannes, tu
        sécurises. En cas de doute sur une configuration critique, valide avec le DG ou
        le PCA avant action.
      </HelpTip>
    </>
  );
}
