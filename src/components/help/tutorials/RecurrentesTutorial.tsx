"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function RecurrentesTutorial() {
  return (
    <>
      <p className="mb-4">
        <strong>Écritures récurrentes</strong> : tu définis une fois pour toutes un modèle
        d&apos;écriture (loyer, abonnement ENEO, provision mensuelle…), puis tu génères
        l&apos;écriture du mois en <strong>un clic</strong> chaque mois. Façon Sage (écritures
        d&apos;abonnement).
      </p>

      <HelpSection title="Créer un modèle (exemple : loyer)">
        <HelpSteps>
          <li>Clique sur <strong>« Nouveau modèle »</strong>.</li>
          <li>
            Remplis l&apos;en-tête :
            <ul className="ml-5 list-disc text-[12.5px]">
              <li><strong>Libellé</strong> : « Loyer bureau Yaoundé ».</li>
              <li><strong>Journal</strong> : <code>OD</code> (opérations diverses) ou <code>ACH</code>.</li>
              <li><strong>Jour du mois</strong> (optionnel) : <code>5</code> — purement indicatif pour t&apos;aider à te rappeler.</li>
              <li><strong>Description</strong> : « Loyer mensuel — Bureau Yaoundé ».</li>
            </ul>
          </li>
          <li>
            Lignes d&apos;écriture :
            <ul className="ml-5 list-disc text-[12.5px]">
              <li>Ligne 1 : compte <code>613000</code> (Locations) — débit 150 000 FCFA.</li>
              <li>Ligne 2 : compte <code>401000</code> (Fournisseurs) — tiers « SCI BAILLEUR » — crédit 150 000 FCFA.</li>
            </ul>
          </li>
          <li>Vérifie le bandeau vert « ✓ Équilibré » puis clique <strong>« Créer le modèle »</strong>.</li>
        </HelpSteps>
      </HelpSection>

      <HelpSection title="Générer l'écriture du mois">
        <HelpSteps>
          <li>Sur la ligne du modèle, clique sur le bouton vert <strong>« Générer »</strong>.</li>
          <li>T-ERP crée immédiatement une écriture <strong>validée</strong> avec la référence <code>REC-xxxxxx-AAAA-MM</code> et la passe en compta.</li>
          <li>La colonne <strong>« Dernier run »</strong> affiche le mois traité avec un badge <strong>« ce mois »</strong>.</li>
          <li>Le bouton « Générer » devient grisé pour ce mois (anti-doublon).</li>
        </HelpSteps>
        <HelpWarn>
          Si la <strong>période courante est clôturée</strong> (cf. page Clôtures), la génération
          est refusée. Demande la réouverture au DAF.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="Activer / désactiver un modèle">
        <p>
          La case à cocher <strong>« Actif »</strong> en fin de ligne active/désactive le modèle.
          Désactivé = le bouton « Générer » est grisé, mais le modèle reste en base.
        </p>
      </HelpSection>

      <HelpSection title="Supprimer un modèle">
        <p>
          Icône poubelle en bout de ligne. La suppression supprime <strong>uniquement</strong> le
          modèle — les écritures déjà générées restent en compta.
        </p>
      </HelpSection>

      <HelpTip>
        Cas d&apos;usage typiques : loyers, abonnements (ENEO, eau, internet, télécoms),
        provisions, amortissements complémentaires non automatisés, dotations diverses.
      </HelpTip>
    </>
  );
}
