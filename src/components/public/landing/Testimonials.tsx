const TESTIMONIALS = [
  {
    initials: "AD",
    name: "Albert DAAYANG",
    role: "Directeur Général · BatimCAM SA",
    quote:
      "Avant T-ERP, on consolidait nos 3 sociétés sur Excel pendant 5 jours. Aujourd'hui c'est temps réel. Mes décisions sont 10 fois plus rapides.",
  },
  {
    initials: "MN",
    name: "Marie NGONO",
    role: "DAF · Razel-Bec Cameroun",
    quote:
      "Les déclarations CNPS/DGI passent du chronophage à un clic. Et l'audit trail nous a sauvés lors du dernier contrôle fiscal.",
  },
  {
    initials: "SO",
    name: "Sandrine ONANA",
    role: "Responsable RH · BatimCAM",
    quote:
      "Le portail recrutement intégré nous a fait gagner 60% du temps de présélection. Les candidats sont notifiés sur WhatsApp automatiquement.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-surface-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold text-ink md:text-3xl">
          Ce que disent nos clients
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="rounded-xl border border-line bg-white p-5 shadow-card"
            >
              <blockquote className="text-sm italic text-ink-2">
                « {t.quote} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white shadow-brand">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-3">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
