"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function GrandLivreTutorial() {
  return (
    <>
      <p className="mb-4">
        Page de <strong>consultation</strong> : Grand-livre (détail d&apos;un compte), Balance
        générale, Balance auxiliaire, et <strong>Lettrage manuel</strong>. C&apos;est ici que tu vas
        chercher l&apos;information ligne à ligne.
      </p>

      <HelpSection title="Filtres communs">
        <p>
          En haut, deux champs :
        </p>
        <ul className="ml-5 list-disc">
          <li><strong>Compte</strong> : par exemple <code>401</code> pour tous les fournisseurs, <code>401001</code> pour un compte précis.</li>
          <li><strong>Période</strong> : sélecteur de mois (YYYY-MM).</li>
        </ul>
      </HelpSection>

      <HelpSection title="Onglet « Grand livre »">
        <p>
          Toutes les lignes du compte choisi sur la période, dans l&apos;ordre chronologique, avec
          débit / crédit / solde courant. Le <strong>solde final</strong> apparaît en bas. Idéal
          pour vérifier la cohérence d&apos;un compte fournisseur ou client.
        </p>
      </HelpSection>

      <HelpSection title="Onglet « Balance générale »">
        <p>
          Tous les comptes du plan SYSCOHADA agrégés par préfixe 4 chiffres avec leur solde sur la
          période. Le pied indique si la balance est <strong>équilibrée</strong> (D = C, vert) ou
          déséquilibrée (rouge).
        </p>
      </HelpSection>

      <HelpSection title="Onglet « Balance auxiliaire »">
        <p>
          Idem mais avec le détail compte par compte (ex : chaque 401x au lieu d&apos;une seule
          ligne 4010). Utile pour repérer un fournisseur qui pèse anormalement.
        </p>
      </HelpSection>

      <HelpSection title="Lettrage manuel">
        <p>
          Le lettrage sert à <strong>rapprocher une facture et son règlement</strong> (ou des
          opérations qui s&apos;annulent) pour qu&apos;elles disparaissent de l&apos;échéancier tiers.
        </p>
        <HelpSteps>
          <li>Va dans l&apos;onglet <strong>« Lettrage »</strong> (sur un compte 401 ou 411, généralement).</li>
          <li>Coche les lignes à lettrer (au moins 2).</li>
          <li>Le bandeau du haut indique le total débit + total crédit + écart. Tant que ce n&apos;est pas équilibré (D = C), le bouton « Lettrer » reste désactivé.</li>
          <li>Clique <strong>« Lettrer »</strong> quand l&apos;écart est nul. Un code de lettrage est attribué (visible dans la colonne « Lettrage »).</li>
        </HelpSteps>
        <HelpWarn>
          Le lettrage est manuel pour l&apos;instant. Un lettrage automatique par référence/montant
          arrivera dans une prochaine itération.
        </HelpWarn>
      </HelpSection>

      <HelpTip>
        Tu peux exporter ces vues en PDF via la page <strong>Rapports</strong> (Balance générale,
        auxiliaire fournisseurs, auxiliaire clients).
      </HelpTip>
    </>
  );
}
