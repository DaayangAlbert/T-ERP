import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Modules", href: "#modules" },
      { label: "Profils", href: "#profils" },
      { label: "Stack & sécurité", href: "#stack" },
      { label: "Comparaison", href: "#comparaison" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/about" },
      { label: "Recrutement", href: "/recrutement" },
      { label: "Blog", href: "/blog" },
      { label: "Partenaires", href: "/partners" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "CGU", href: "/legal/cgu" },
      { label: "CGV", href: "/legal/cgv" },
      { label: "Confidentialité", href: "/legal/privacy" },
      { label: "Mentions légales", href: "/legal/mentions" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#0F0014] py-12 text-white/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8" />
              <span className="text-base font-bold text-white">T-ERP</span>
            </div>
            <p className="mt-3 text-xs text-white/60">
              ERP BTP multi-tenant pour les PME camerounaises.
              <br />
              Yaoundé · Douala · Cameroun
            </p>
            <p className="mt-3 text-[11px] text-white/40">
              contact@terpgroup.com · +237 6 90 00 00 00
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-white/70 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-white/50">
          <span>
            © {new Date().getFullYear()} T-ERP — Tous droits réservés. Conforme loi
            2010/012 (Cameroun).
          </span>
          <Link
            href="/?login=1"
            className="rounded-md border border-cyan-400/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80 hover:border-cyan-400/60 hover:text-cyan-200"
            title="Réservé aux super-admins Anthropic"
          >
            Console plateforme →
          </Link>
        </div>
      </div>
    </footer>
  );
}
