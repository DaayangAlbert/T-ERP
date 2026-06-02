"use client";

import { HelpSection, HelpTip } from "@/components/help/PageHelp";

export function DashboardTutorial() {
  return (
    <>
      <p className="mb-4">
        Page d&apos;accueil de l&apos;espace comptable. Elle te donne une <strong>vue rapide
        de l&apos;activité</strong> et les <strong>priorités du jour</strong> sans avoir à
        ouvrir chaque page.
      </p>

      <HelpSection title="Bandeau périmètre (en haut)">
        <ul className="ml-5 list-disc">
          <li><strong>Comptable Direction</strong> : tu vois tous les chantiers du groupe.</li>
          <li><strong>Comptable Chantier</strong> : limité aux chantiers qui te sont affectés (cf. ton profil).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Les KPI">
        <p>
          Quatre chiffres-clés pour piloter ta journée : écritures du mois, montants débit/crédit
          cumulés, statut équilibré ou non. Si tu vois « ✗ Déséquilibre », il faut investiguer
          dans <strong>Saisie d&apos;écritures</strong> ou <strong>Grand livre</strong>.
        </p>
      </HelpSection>

      <HelpSection title="Priorités">
        <p>
          Liste de ce qui t&apos;attend : factures à comptabiliser, échéances proches, validations
          assignées. Clique sur chaque carte pour aller directement à la page concernée.
        </p>
      </HelpSection>

      <HelpSection title="Suivi paiement assigné">
        <p>
          Les étapes de paiement où le DAF t&apos;a désigné pour préparer l&apos;écriture. Tu y vas
          via la sidebar « Suivi paiement assigné » ou via les cartes ici.
        </p>
      </HelpSection>

      <HelpSection title="Graphes">
        <ul className="ml-5 list-disc">
          <li><strong>Évolution des écritures</strong> : volume par journée/semaine.</li>
          <li><strong>Répartition par journal</strong> : poids relatif ACH/VTE/OD/BQ/CAI/PAIE.</li>
        </ul>
      </HelpSection>

      <HelpSection title="Activité récente">
        <p>
          Les dernières écritures saisies — utile pour reprendre rapidement le fil d&apos;une journée
          ou vérifier le travail d&apos;un collègue.
        </p>
      </HelpSection>

      <HelpTip>
        Cette page est <strong>en lecture seule</strong> — toutes les actions se font sur les pages
        spécialisées (Saisie d&apos;écritures, Trésorerie, etc.).
      </HelpTip>
    </>
  );
}
