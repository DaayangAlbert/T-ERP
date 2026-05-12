const PROFILES = [
  { icon: "👑", name: "DG", desc: "Vue consolidée multi-sociétés" },
  { icon: "💼", name: "DAF", desc: "Trésorerie, budgets, conformité" },
  { icon: "📋", name: "Secrétaire Générale", desc: "Délégations, agenda, contrats" },
  { icon: "👥", name: "RH", desc: "Recrutement, paie, congés" },
  { icon: "🔧", name: "Direction Technique", desc: "Études, méthodes, QHSE" },
  { icon: "🏗", name: "Directeur Travaux", desc: "Pilotage projet multi-chantiers" },
  { icon: "📐", name: "Conducteur Travaux", desc: "Plan du jour, équipes, jalons" },
  { icon: "👷", name: "Chef de Chantier", desc: "Pointage, sécurité, matériel" },
  { icon: "🧰", name: "Magasinier", desc: "Stocks, sorties, inventaires" },
  { icon: "🚚", name: "Logisticien", desc: "Flotte, transferts, achats" },
  { icon: "📑", name: "Comptable", desc: "SYSCOHADA, écritures, déclarations" },
  { icon: "📚", name: "GED", desc: "Documents, workflows, archivage" },
  { icon: "🛠", name: "IT Admin", desc: "Utilisateurs, rôles, intégrations" },
];

export function ProfilesGrid() {
  return (
    <section className="bg-surface-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            13 profils métier prêts à l&apos;emploi
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Chaque rôle dispose de son interface dédiée, sans formation longue.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {PROFILES.map((p) => (
            <div
              key={p.name}
              className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 transition-shadow hover:shadow-card"
            >
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{p.name}</div>
                <div className="text-xs text-ink-3">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
