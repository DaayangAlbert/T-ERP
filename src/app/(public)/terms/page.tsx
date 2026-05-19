import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — T-ERP",
  description:
    "Conditions générales d'utilisation du service T-ERP, ERP SaaS pour PME camerounaises.",
  alternates: { canonical: "https://terpgroup.com/terms" },
};

const UPDATED_AT = "2026-05-19";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-[14px] leading-relaxed text-ink">
      <header className="mb-8 border-b border-line pb-4">
        <Link href="/" className="text-[12px] text-primary hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Conditions Générales d'Utilisation
        </h1>
        <p className="mt-1 text-[12px] text-ink-3">
          Version du {UPDATED_AT} · Applicable au service T-ERP
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">1. Objet</h2>
          <p className="mt-1 text-ink-2">
            Les présentes Conditions Générales d'Utilisation (CGU) régissent
            l'accès et l'utilisation du logiciel T-ERP, plateforme SaaS de
            gestion d'entreprise (« le Service ») éditée par Taiga
            (« l'Éditeur »). Toute souscription au Service emporte adhésion
            sans réserve aux présentes CGU.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. Inscription et compte</h2>
          <p className="mt-1 text-ink-2">
            L'utilisation du Service est subordonnée à la création d'un
            compte. Le Client garantit l'exactitude des informations fournies
            et s'engage à les tenir à jour. Le Client est responsable de la
            confidentialité de ses identifiants et de toute action effectuée
            depuis son compte.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. Abonnement et facturation</h2>
          <p className="mt-1 text-ink-2">
            L'accès au Service est facturé selon le plan choisi
            (STARTER, STANDARD, BUSINESS, ENTERPRISE). Les prix sont libellés
            en francs CFA (XAF) hors taxes, la TVA camerounaise (19,25 %)
            étant appliquée en sus. Le paiement s'effectue par virement
            bancaire ou tout autre moyen accepté par l'Éditeur. Le défaut de
            paiement à l'échéance entraîne la suspension immédiate du Service
            après mise en demeure restée infructueuse pendant 15 jours.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. Durée et résiliation</h2>
          <p className="mt-1 text-ink-2">
            L'abonnement est conclu pour une durée indéterminée. Le Client
            peut le résilier à tout moment moyennant un préavis de 30 jours
            par courrier électronique à l'Éditeur. L'Éditeur peut résilier
            l'abonnement en cas de manquement grave du Client après mise en
            demeure.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. Propriété des données</h2>
          <p className="mt-1 text-ink-2">
            Les données saisies, importées ou générées par le Client dans le
            Service restent sa propriété exclusive. L'Éditeur dispose d'une
            licence non exclusive aux seules fins d'exécution du Service.
            En fin d'abonnement, le Client dispose de 30 jours pour récupérer
            ses données via export.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. Niveau de service</h2>
          <p className="mt-1 text-ink-2">
            L'Éditeur s'engage sur une disponibilité de 99 % du Service en
            moyenne mensuelle (hors maintenance planifiée annoncée 48 h à
            l'avance). Le support est assuré par email et WhatsApp aux
            horaires ouvrables (Africa/Douala).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">7. Responsabilité</h2>
          <p className="mt-1 text-ink-2">
            L'Éditeur ne saurait être tenu responsable des dommages indirects
            (perte de chiffre d'affaires, perte de clientèle, etc.). En tout
            état de cause, la responsabilité de l'Éditeur est plafonnée au
            montant des sommes versées par le Client au cours des 12 mois
            précédant le fait générateur.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">8. Données personnelles</h2>
          <p className="mt-1 text-ink-2">
            Le traitement des données à caractère personnel est régi par la{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>
            , partie intégrante des présentes CGU.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">9. Droit applicable et juridiction</h2>
          <p className="mt-1 text-ink-2">
            Les présentes CGU sont soumises au droit camerounais et au droit
            OHADA pour les actes uniformes applicables. Tout litige relèvera
            de la compétence exclusive des tribunaux de Douala, à défaut de
            résolution amiable préalable.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">10. Modification des CGU</h2>
          <p className="mt-1 text-ink-2">
            L'Éditeur se réserve le droit de modifier les présentes CGU. Les
            nouvelles conditions seront notifiées au Client par email 30
            jours avant leur entrée en vigueur. En cas de désaccord, le
            Client peut résilier sans frais.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-[12px] text-ink-3">
        Pour toute question relative aux présentes CGU, contactez{" "}
        <a href="mailto:contact@terpgroup.com" className="text-primary hover:underline">
          contact@terpgroup.com
        </a>
        .
      </footer>
    </article>
  );
}
