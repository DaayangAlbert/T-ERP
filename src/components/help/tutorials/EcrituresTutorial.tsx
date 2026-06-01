"use client";

import { HelpSection, HelpSteps, HelpTip, HelpWarn } from "@/components/help/PageHelp";

export function EcrituresTutorial() {
  return (
    <>
      <p className="mb-4">
        Cette page sert à <strong>enregistrer toutes les opérations comptables</strong> :
        achats fournisseurs, ventes, salaires, encaissements, écritures diverses. Chaque
        écriture respecte la <strong>partie double</strong> (débit = crédit).
      </p>

      <HelpSection title="1. Enregistrer une dépense (achat fournisseur)">
        <p><em>Exemple : tu achètes pour 50 000 FCFA de ciment chez CIMENCAM, facture FA-001.</em></p>
        <HelpSteps>
          <li>Clique sur <strong>« Nouvelle écriture »</strong> (bouton violet en haut à droite).</li>
          <li>Sous <strong>« Type d&apos;opération »</strong>, choisis <strong>« Achat simple »</strong>.</li>
          <li>Tape le montant dans le champ violet « Montant (FCFA) » : <code>50000</code>.</li>
          <li>
            Remplis l&apos;en-tête :
            <ul className="ml-5 list-disc text-[12.5px]">
              <li><strong>Date</strong> : date de la facture.</li>
              <li><strong>Référence</strong> : numéro de la pièce (ex : <code>FA-001</code>) — obligatoire.</li>
              <li><strong>Chantier</strong> (analytique) : sélectionne le chantier concerné si applicable.</li>
              <li><strong>Libellé</strong> : ex « Ciment CIMENCAM facture FA-001 ».</li>
            </ul>
          </li>
          <li>
            Sur la ligne <strong>401000 (Fournisseurs)</strong>, dans la colonne <strong>« Tiers »</strong>,
            tape les premières lettres (ex <code>CIM</code>) et choisis <strong>CIMENCAM</strong> dans la liste.
          </li>
          <li>
            <strong>Pièce justificative</strong> (recommandée) : clique sur le bandeau violet « Joindre un
            justificatif » et sélectionne ta facture (PDF, image, Word, Excel — max 20 Mo).
          </li>
          <li>
            Vérifie le bandeau vert en bas : <strong>« ✓ Équilibré »</strong>. Sinon le bouton « Enregistrer »
            reste désactivé.
          </li>
          <li>Clique <strong>« Enregistrer et valider »</strong> pour passer l&apos;écriture définitivement,
            ou <strong>« Enregistrer en brouillard »</strong> pour la modifier plus tard.</li>
        </HelpSteps>
        <p className="mt-2 text-[12.5px] text-ink-3">
          ✅ L&apos;écriture apparaît dans la liste. Le justificatif est ré-téléchargeable via le bouton
          « <strong>Voir</strong> » dans la colonne <strong>Pièce</strong>.
        </p>
      </HelpSection>

      <HelpSection title="2. Enregistrer une vente">
        <p>
          Pour les <strong>situations de travaux</strong> (MOA, BPU, TVA + retenues), utilise plutôt la
          page <strong>« Situations clients »</strong> qui calcule tout automatiquement
          (TVA 19,25 % + retenue garantie 5 % + retenue source 2,2 %).
        </p>
        <p>
          Pour une recette ponctuelle (encaissement direct, ticket de caisse client…), choisis ici le modèle
          <strong> « Vente »</strong> : tape le montant <strong>HT</strong>, T-ERP calcule la TVA et remplit
          les lignes 411 / 70x / 443.
        </p>
      </HelpSection>

      <HelpSection title="3. Les modèles d'opération (boutons en haut)">
        <ul className="ml-5 list-disc">
          <li><strong>Achat simple</strong> : 1 montant → débite 6xx (charge) / crédite 401 (fournisseur).</li>
          <li><strong>Vente</strong> : 1 montant HT → calcule TVA, débite 411 (client) / crédite 70x + 443 (TVA).</li>
          <li><strong>Dépense caisse</strong> : 1 montant → débite la charge / crédite 532 (caisse).</li>
          <li><strong>Encaissement</strong> : 1 montant → débite 521/532 / crédite 411.</li>
          <li><strong>OD libre</strong> : tu saisis manuellement chaque ligne (D et C).</li>
        </ul>
        <HelpTip>
          Avec un modèle, les comptes sont verrouillés (fond violet pâle). Pour avoir la main complète sur
          les lignes, utilise <strong>« OD libre »</strong>.
        </HelpTip>
      </HelpSection>

      <HelpSection title="4. Valider, brouillard, contrepasser">
        <p>
          <strong>Brouillard</strong> (statut orange) : modifiable, mais ne compte pas encore dans les états.
          <br />
          <strong>Validée</strong> (statut vert) : passée pour de vrai dans la compta. Non supprimable.
        </p>
        <p>Si tu as fait une erreur sur une écriture validée :</p>
        <HelpSteps>
          <li>Retrouve-la dans la liste.</li>
          <li>Clique sur <strong>« Contrepasser »</strong> dans la colonne actions.</li>
          <li>Confirme : T-ERP crée une écriture <strong>inverse</strong> (référence <code>EXT-…</code>) datée du jour.</li>
          <li>Saisis ensuite la bonne écriture si besoin.</li>
        </HelpSteps>
        <HelpWarn>
          On ne <strong>supprime jamais</strong> une écriture validée — la contrepassation préserve la piste
          d&apos;audit, comme dans Sage.
        </HelpWarn>
      </HelpSection>

      <HelpSection title="5. Périodes clôturées">
        <p>
          Si la <strong>période</strong> (mois) de la date saisie est clôturée (cf. page « Clôtures »), la
          saisie et la validation sont <strong>refusées</strong> avec le message « Période YYYY-MM clôturée ».
          Demande au DAF de rouvrir la période avant de saisir.
        </p>
      </HelpSection>

      <HelpSection title="6. Astuces">
        <ul className="ml-5 list-disc">
          <li>
            <strong>Autocomplétion des comptes</strong> : tape les premiers chiffres (<code>60</code>,
            <code>40</code>, <code>51</code>…) et la liste du plan SYSCOHADA s&apos;affiche.
          </li>
          <li>
            <strong>Tiers obligatoire</strong> sur les comptes 401 (fournisseurs) et 411 (clients). Tape
            le nom, choisis dans la liste — ça alimente l&apos;<strong>échéancier tiers</strong> automatiquement.
          </li>
          <li>
            <strong>Équilibre forcé</strong> : les boutons « Enregistrer » sont désactivés tant que
            débit ≠ crédit.
          </li>
          <li>
            La <strong>référence</strong> est unique par journal + tenant. Si tu re-saisis avec la même
            référence, tu auras une erreur — change-la (ex: <code>FA-001-bis</code>).
          </li>
        </ul>
      </HelpSection>

      <HelpSection title="Erreurs courantes">
        <ul className="ml-5 list-disc">
          <li><strong>« Référence requise »</strong> → tu as oublié le numéro de pièce dans l&apos;en-tête.</li>
          <li><strong>« Compte inconnu au plan »</strong> → code mal saisi ou pas dans le plan. Utilise l&apos;autocomplétion.</li>
          <li><strong>« Tiers obligatoire (401/411) »</strong> → choisis un fournisseur/client dans la colonne Tiers.</li>
          <li><strong>« Écriture non équilibrée »</strong> → vérifie le total débit = total crédit.</li>
          <li><strong>« Période clôturée »</strong> → date dans un mois fermé, change la date ou demande la réouverture.</li>
        </ul>
      </HelpSection>
    </>
  );
}
