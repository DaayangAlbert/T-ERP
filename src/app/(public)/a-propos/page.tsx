import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ShieldCheck, MapPin, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos — T-ERP",
  description:
    "T-ERP est l'ERP BTP multi-tenant pensé pour les PME camerounaises : SYSCOHADA, CNPS/DGI, gestion de chantiers, paie et trésorerie sur une seule plateforme.",
  alternates: { canonical: "https://terpgroup.com/a-propos" },
};

const VALUES = [
  {
    icon: Building2,
    title: "Pensé pour le BTP camerounais",
    body: "Chantiers, sous-traitance, pointage terrain, magasin et engins : T-ERP couvre les réalités d'une entreprise de construction au Cameroun, pas un ERP générique adapté à la marge.",
  },
  {
    icon: ShieldCheck,
    title: "Conforme et souverain",
    body: "Comptabilité SYSCOHADA native, déclarations CNPS et DGI, conformité à la loi 2010/012. Vos données sont hébergées sur une infrastructure dédiée que nous opérons.",
  },
  {
    icon: MapPin,
    title: "Ancrage local",
    body: "Une équipe qui connaît le terrain — Yaoundé, Douala et au-delà — et un support en français aux horaires ouvrables (Africa/Douala), par email et WhatsApp.",
  },
  {
    icon: HeartHandshake,
    title: "Multi-tenant & multi-filiales",
    body: "Une plateforme unique pour piloter plusieurs sociétés ou filiales, avec une isolation stricte des données entre chaque entité.",
  },
];

export default function AboutPage() {
  return (
    <div className="text-ink">
      {/* Hero */}
      <section className="bg-brand-gradient-dark px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-[12px] text-white/70 hover:text-white">
            ← Retour à l'accueil
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            L'ERP qui parle BTP, SYSCOHADA et chantier.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80">
            T-ERP est une plateforme de gestion (ERP) en mode SaaS conçue pour les
            PME du bâtiment et des travaux publics au Cameroun. Notre objectif :
            remplacer les classeurs Excel éparpillés et les logiciels importés mal
            adaptés par un outil unique, local et complet — de la trésorerie au
            pointage des ouvriers.
          </p>
        </div>
      </section>

      {/* Valeurs */}
      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-xl border border-line bg-white p-5 shadow-card"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-base font-semibold">{v.title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                  {v.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Éditeur */}
      <section className="bg-surface-alt px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-lg font-semibold">L'éditeur</h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
            T-ERP est édité par <strong>Taiga</strong>. Pour les informations
            légales détaillées (forme juridique, siège, hébergement), consultez nos{" "}
            <Link href="/mentions-legales" className="text-primary hover:underline">
              mentions légales
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 rounded-2xl border border-line bg-white p-8 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Envie de voir T-ERP en action ?</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">
              Réservez une démonstration gratuite de 45 minutes adaptée à votre
              activité.
            </p>
          </div>
          <Link
            href="/#demo"
            className="inline-flex shrink-0 items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:bg-primary-600"
          >
            Demander une démo →
          </Link>
        </div>
      </section>
    </div>
  );
}
