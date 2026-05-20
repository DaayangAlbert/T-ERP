import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — T-ERP",
  description:
    "Mentions légales du site et du service T-ERP, ERP SaaS pour PME camerounaises, édité par Taiga.",
  alternates: { canonical: "https://terpgroup.com/mentions-legales" },
};

const UPDATED_AT = "2026-05-19";

// NOTE: les valeurs entre crochets [à compléter] doivent être renseignées
// avec les informations légales réelles de la société éditrice (RCCM, NIU,
// capital, siège, directeur de la publication, téléphone).
export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-[14px] leading-relaxed text-ink">
      <header className="mb-8 border-b border-line pb-4">
        <Link href="/" className="text-[12px] text-primary hover:underline">
          ← Retour à l'accueil
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Mentions légales</h1>
        <p className="mt-1 text-[12px] text-ink-3">
          Version du {UPDATED_AT} · Site terpgroup.com & service T-ERP
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">1. Éditeur du site</h2>
          <p className="mt-1 text-ink-2">
            Le site <strong>terpgroup.com</strong> et le service{" "}
            <strong>T-ERP</strong> sont édités par <strong>Taiga</strong>{" "}
            (« l'Éditeur »).
          </p>
          <ul className="mt-2 space-y-1 text-ink-2">
            <li>Forme juridique : <Placeholder>à compléter</Placeholder></li>
            <li>Capital social : <Placeholder>à compléter</Placeholder></li>
            <li>RCCM : <Placeholder>à compléter</Placeholder></li>
            <li>Numéro d'identifiant unique (NIU) : <Placeholder>à compléter</Placeholder></li>
            <li>Siège social : <Placeholder>à compléter</Placeholder>, Cameroun</li>
            <li>
              Email :{" "}
              <a href="mailto:contact@terpgroup.com" className="text-primary hover:underline">
                contact@terpgroup.com
              </a>
            </li>
            <li>Téléphone : <Placeholder>à compléter</Placeholder></li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. Directeur de la publication</h2>
          <p className="mt-1 text-ink-2">
            Le directeur de la publication est <Placeholder>à compléter</Placeholder>,
            représentant légal de l'Éditeur.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. Hébergement</h2>
          <p className="mt-1 text-ink-2">
            Le service est hébergé par <strong>OVH SAS</strong>, société au capital
            de 10 174 560 €, 2 rue Kellermann, 59100 Roubaix, France —{" "}
            <a href="https://www.ovhcloud.com" className="text-primary hover:underline">
              ovhcloud.com
            </a>
            . Les données sont stockées sur une infrastructure dédiée opérée par
            l'Éditeur.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. Propriété intellectuelle</h2>
          <p className="mt-1 text-ink-2">
            L'ensemble des éléments du site et du service T-ERP (marque, logo,
            interface, textes, code source, charte graphique) est la propriété
            exclusive de l'Éditeur ou de ses partenaires et est protégé par le
            droit de la propriété intellectuelle. Toute reproduction ou
            représentation, totale ou partielle, sans autorisation écrite
            préalable de l'Éditeur est interdite.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. Données personnelles</h2>
          <p className="mt-1 text-ink-2">
            Le traitement des données à caractère personnel est décrit dans la{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>
            . Conformément à la loi camerounaise n° 2010/012 relative à la
            cybersécurité et à la cybercriminalité, vous disposez d'un droit
            d'accès, de rectification et de suppression de vos données en
            écrivant à{" "}
            <a href="mailto:contact@terpgroup.com" className="text-primary hover:underline">
              contact@terpgroup.com
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. Cookies</h2>
          <p className="mt-1 text-ink-2">
            Le site n'utilise que des cookies strictement nécessaires à son
            fonctionnement (session d'authentification, préférences d'affichage).
            Aucun cookie publicitaire ni traceur tiers n'est déposé.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">7. Droit applicable</h2>
          <p className="mt-1 text-ink-2">
            Les présentes mentions légales sont soumises au droit camerounais et
            au droit OHADA. Tout litige relèvera de la compétence des tribunaux de
            Douala, à défaut de résolution amiable préalable.
          </p>
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-[12px] text-ink-3">
        Voir aussi nos{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Conditions Générales d'Utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Politique de confidentialité
        </Link>
        .
      </footer>
    </article>
  );
}

// Champ à renseigner par l'Éditeur — rendu visuellement discret.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="italic text-ink-3" title="À compléter par l'éditeur">
      [{children}]
    </span>
  );
}
