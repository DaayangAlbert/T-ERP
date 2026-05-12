import { Building2, Coins, FileText, Shield } from "lucide-react";

const PROBLEMS = [
  {
    icon: Building2,
    title: "Suivi multi-chantiers",
    body: "Tableau de bord temps réel avec coûts, avancement physique, alertes par chantier. Plus de fichiers Excel éparpillés.",
  },
  {
    icon: Coins,
    title: "Paie SYSCOHADA conforme",
    body: "Bulletins, déclarations CNPS, IRPP, retenues à la source — calculés en un clic selon la grille BTP.",
  },
  {
    icon: FileText,
    title: "Documents jamais perdus",
    body: "GED transverse (marchés, contrats, factures, attestations) avec workflows de validation et archivage légal DUA.",
  },
  {
    icon: Shield,
    title: "Conformité CNPS / DGI",
    body: "Échéanciers fiscaux, déclarations automatiques, audit trail complet pour la moindre inspection.",
  },
];

export function ProblemsSolved() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            Les 4 maux du BTP camerounais, résolus
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Conçu avec des DG et DAF qui ont vécu vos problèmes au quotidien.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-line p-5 transition-shadow hover:shadow-brand-lg"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
