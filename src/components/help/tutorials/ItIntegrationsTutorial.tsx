"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function ItIntegrationsTutorial() {
  return (
    <>
      <p className="mb-4">
        Gestion des <strong>intégrations</strong> externes du tenant : banques, fisc,
        CNPS, e-signature, GED externe, WhatsApp Business.
      </p>

      <HelpSection title="Intégrations bancaires">
        <p>
          Connexion API banques partenaires pour récupération automatique des relevés
          (BICEC, SCB, AFRILAND, etc.). Mode lecture seule — pas de virement initié.
        </p>
      </HelpSection>

      <HelpSection title="Téléprocédures fiscales">
        <p>
          Connexion DGI / DSF pour envoi automatisé des déclarations TVA, IRPP,
          impôt société. Identifiants tenant déjà saisis par le DAF.
        </p>
      </HelpSection>

      <HelpSection title="Statut des intégrations">
        <p>
          Pour chaque connecteur : statut (OK, erreur, déconnecté), dernière
          synchronisation réussie, nombre d&apos;erreurs sur 24 h. Badge rouge si
          défaillance.
        </p>
      </HelpSection>

      <HelpSection title="Logs">
        <p>
          Journal des appels API, payloads échangés, erreurs détaillées. Utile pour
          diagnostiquer un dysfonctionnement avec le support de l&apos;intégrateur.
        </p>
      </HelpSection>

      <HelpTip>
        Une intégration en panne génère des dérives silencieuses (relevés manquants,
        déclarations non envoyées). Surveille les badges rouges chaque jour.
      </HelpTip>
    </>
  );
}
