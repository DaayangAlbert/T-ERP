import { BookOpen, ShieldCheck, Coins, Users } from "lucide-react";

const REASONS = [
  {
    icon: BookOpen,
    title: "Formation continue",
    body: "40h de formation/an, certifications BTP financées, mobilité interne facilitée.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité au cœur",
    body: "Démarche Zero Accident, EPI complets, formations HSE trimestrielles obligatoires.",
  },
  {
    icon: Coins,
    title: "Salaires +15% vs marché",
    body: "Grille BTP transparente, intéressement aux résultats, mutuelle santé famille.",
  },
  {
    icon: Users,
    title: "Diversité réelle",
    body: "22% de femmes (vs 8% secteur), 5 nationalités, équipes intergénérationnelles.",
  },
];

export function WhyJoinUs() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold text-ink md:text-3xl">
          Pourquoi nous rejoindre
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <div key={r.title} className="rounded-xl border border-line p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink">{r.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
