import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — T-ERP",
  description:
    "Politique de confidentialité et de protection des données personnelles du service T-ERP.",
  alternates: { canonical: "https://terpgroup.com/privacy" },
};

const UPDATED_AT = "2026-05-19";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-[14px] leading-relaxed text-ink">
      <header className="mb-8 border-b border-line pb-4">
        <Link href="/" className="text-[12px] text-primary hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Politique de confidentialité
        </h1>
        <p className="mt-1 text-[12px] text-ink-3">
          Version du {UPDATED_AT}
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">1. Responsable du traitement</h2>
          <p className="mt-1 text-ink-2">
            T-ERP est édité par Taiga, dont le siège est à Douala (Cameroun).
            Le responsable du traitement des données personnelles peut être
            contacté à l'adresse{" "}
            <a href="mailto:dpo@terpgroup.com" className="text-primary hover:underline">
              dpo@terpgroup.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. Données collectées</h2>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-ink-2">
            <li>
              <strong>Données d'identification :</strong> nom, prénom, email,
              téléphone, fonction.
            </li>
            <li>
              <strong>Données professionnelles :</strong> données saisies par
              le Client dans le Service (employés, chantiers, factures, etc.).
            </li>
            <li>
              <strong>Données techniques :</strong> adresse IP, type de
              navigateur, horodatage de connexion, journaux d'audit.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. Finalités du traitement</h2>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-ink-2">
            <li>Fournir et maintenir le Service souscrit.</li>
            <li>Assurer la sécurité (anti-fraude, audit, lutte contre les abus).</li>
            <li>Facturer le Client et répondre aux obligations légales.</li>
            <li>Améliorer le Service à partir de données agrégées et anonymisées.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. Base légale</h2>
          <p className="mt-1 text-ink-2">
            Exécution du contrat (CGU souscrites par le Client), respect
            d'obligations légales (comptabilité, fiscalité, droit du travail
            au Cameroun), et intérêt légitime de l'Éditeur (sécurité et
            amélioration du Service).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. Hébergement et localisation</h2>
          <p className="mt-1 text-ink-2">
            Les données sont hébergées sur des serveurs situés dans l'Union
            européenne ou au Cameroun, conformément aux exigences de
            confidentialité applicables. Aucun transfert n'est effectué hors
            de ces zones sans garanties appropriées (clauses contractuelles
            types).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. Durée de conservation</h2>
          <ul className="mt-1 list-disc space-y-1 pl-6 text-ink-2">
            <li>
              Données du Service : durée de l'abonnement + 30 jours
              (récupération) puis suppression définitive.
            </li>
            <li>
              Données comptables et fiscales : 10 ans conformément aux
              obligations OHADA.
            </li>
            <li>
              Journaux d'audit : 3 ans conformément aux obligations de
              sécurité.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">7. Droits des personnes</h2>
          <p className="mt-1 text-ink-2">
            Conformément à la loi camerounaise n° 2010/012 du 21 décembre
            2010 relative à la cybersécurité et aux normes internationales en
            la matière, toute personne dispose d'un droit d'accès, de
            rectification, d'effacement, de limitation, d'opposition et de
            portabilité de ses données. Ces droits s'exercent en écrivant à{" "}
            <a href="mailto:dpo@terpgroup.com" className="text-primary hover:underline">
              dpo@terpgroup.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">8. Sous-traitants</h2>
          <p className="mt-1 text-ink-2">
            L'Éditeur fait appel à des sous-traitants pour l'hébergement,
            l'envoi d'emails transactionnels et le paiement. La liste détaillée
            est communiquée sur simple demande à dpo@terpgroup.com.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">9. Sécurité</h2>
          <p className="mt-1 text-ink-2">
            L'Éditeur met en œuvre des mesures techniques et organisationnelles
            adaptées : chiffrement des mots de passe (bcrypt), TLS sur les
            communications, journalisation des accès, sauvegardes
            quotidiennes, isolation stricte des données entre tenants
            (multi-tenancy par champ <code>tenantId</code> + filtrage applicatif).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">10. Cookies</h2>
          <p className="mt-1 text-ink-2">
            T-ERP utilise uniquement des cookies fonctionnels strictement
            nécessaires (authentification, préférences). Aucun cookie
            publicitaire ni traceur tiers n'est déposé.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-[12px] text-ink-3">
        Voir aussi les{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Conditions Générales d'Utilisation
        </Link>
        .
      </footer>
    </article>
  );
}
