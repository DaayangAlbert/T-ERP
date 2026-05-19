interface Profile {
  icon: string;
  name: string;
  desc: string;
  comingSoon?: boolean;
}

const PROFILES: Profile[] = [
  { icon: "👑", name: "Directeur Général", desc: "Vue consolidée multi-sociétés, objectifs, validations N+2" },
  { icon: "💼", name: "DAF", desc: "Trésorerie prévisionnelle, budgets, conformité fiscale" },
  { icon: "📋", name: "Secrétaire Générale", desc: "Délégations, agenda, contrats, mandats, gouvernance" },
  { icon: "👥", name: "Responsable RH", desc: "Recrutement, paie SYSCOHADA, congés, formation" },
  { icon: "🔧", name: "Direction Technique", desc: "Études, méthodes, planning, sous-traitance" },
  { icon: "🏗", name: "Directeur Travaux", desc: "Pilotage multi-chantiers, P&L projet, alertes" },
  { icon: "📐", name: "Conducteur Travaux", desc: "Plan du jour, équipes, jalons, qualité, sécurité" },
  { icon: "👷", name: "Chef de Chantier", desc: "Pointage 48px, matériel, livraisons, HSE terrain" },
  { icon: "🧱", name: "Ouvrier (PWA)", desc: "Mon pointage, mes bulletins, mes congés sur mobile" },
  { icon: "🧰", name: "Magasinier", desc: "Stocks, sorties, inventaires, scan QR codes" },
  { icon: "🚚", name: "Logisticien", desc: "Flotte engins, transferts inter-chantiers, achats" },
  { icon: "📑", name: "Comptable", desc: "Écritures SYSCOHADA, balance, déclarations DGI/CNPS" },
  { icon: "📚", name: "Référent Documentaire", desc: "GED transverse, workflows validation, archivage légal" },
  { icon: "🛠", name: "Administrateur IT", desc: "Utilisateurs, rôles, intégrations, audit technique" },
  {
    icon: "⛑",
    name: "Responsable QHSE",
    desc: "Audits sécurité, NC, formations HSE, incidents, conformité ISO 45001",
    comingSoon: true,
  },
  {
    icon: "📍",
    name: "Topographe",
    desc: "Levés, implantations, plans de récolement, GPS terrain",
    comingSoon: true,
  },
  {
    icon: "⛰",
    name: "Géotechnicien",
    desc: "Études de sol, sondages, essais labo, rapports géotechniques",
    comingSoon: true,
  },
  {
    icon: "📊",
    name: "Contrôleur de Gestion",
    desc: "Reporting analytique, écarts budget vs réel, KPIs financiers",
    comingSoon: true,
  },
  {
    icon: "🛒",
    name: "Acheteur",
    desc: "AO fournisseurs, contrats cadres, gestion catalogues, AOC",
    comingSoon: true,
  },
  {
    icon: "🎓",
    name: "Candidat (portail emploi)",
    desc: "Postule, suit ses candidatures, prépare ses entretiens",
  },
];

export function ProfilesGrid() {
  return (
    <section id="profils" className="bg-surface-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            {PROFILES.length} profils métier, une seule plateforme
          </h2>
          <p className="mt-2 text-sm text-ink-3">
            Chaque rôle dispose d&apos;une interface dédiée, sans formation
            longue. Roadmap publique : nouveaux profils ajoutés chaque trimestre.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {PROFILES.map((p) => (
            <div
              key={p.name}
              className={`relative flex items-start gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-card ${
                p.comingSoon ? "border-amber-200" : "border-line"
              }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  {p.comingSoon ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                      Bientôt
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-ink-3">
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ink-3">
          ✅ Profils disponibles dès la mise en service · ⏳ <strong>Bientôt</strong> = roadmap T2-T4 2026 ·
          Tous les profils héritent automatiquement de la sécurité et de la
          conformité plateforme.
        </p>
      </div>
    </section>
  );
}
