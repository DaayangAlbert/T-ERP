import { Check } from "lucide-react";
import { clsx } from "clsx";

const PLANS = [
  {
    name: "Essentiel",
    price: "95 K",
    unit: "FCFA / mois",
    target: "PME 5-30 employés",
    cta: "Démarrer",
    highlighted: false,
    features: [
      "1 société, 5 chantiers max",
      "RH & paie SYSCOHADA",
      "Comptabilité de base",
      "Support email",
      "PWA terrain",
    ],
  },
  {
    name: "Pro",
    price: "285 K",
    unit: "FCFA / mois",
    target: "PME 30-150 employés",
    cta: "Demander une démo",
    highlighted: true,
    features: [
      "1 société + 2 filiales",
      "Chantiers illimités",
      "GED + workflows validation",
      "WhatsApp Business intégré",
      "Recrutement complet",
      "Support prioritaire 24h",
    ],
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    unit: "",
    target: "Groupes 150+ employés",
    cta: "Contacter",
    highlighted: false,
    features: [
      "Multi-sociétés illimitées",
      "Consolidation groupe",
      "SLA 99,9% + DPO dédié",
      "Intégrations sur mesure",
      "Formation sur site",
      "Audit annuel inclus",
    ],
  },
];

export function PricingPlans() {
  return (
    <section id="tarifs" className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            Des tarifs adaptés à votre taille
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Tout inclus : mises à jour, support, hébergement Cameroun. Sans engagement.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={clsx(
                "relative flex flex-col rounded-xl border bg-white p-6",
                p.highlighted
                  ? "border-primary shadow-brand-lg ring-1 ring-primary"
                  : "border-line",
              )}
            >
              {p.highlighted ? (
                <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-brand">
                  Recommandé
                </span>
              ) : null}
              <h3 className="text-lg font-bold text-ink">{p.name}</h3>
              <p className="text-xs text-ink-3">{p.target}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-ink">{p.price}</span>
                <span className="text-xs text-ink-3">{p.unit}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="text-ink-2">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#demo"
                className={clsx(
                  "mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold",
                  p.highlighted
                    ? "bg-primary text-white shadow-brand hover:bg-primary-600"
                    : "border border-line text-ink-2 hover:bg-surface-alt",
                )}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
