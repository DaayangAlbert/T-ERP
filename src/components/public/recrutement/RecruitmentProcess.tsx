const STEPS = [
  { num: 1, label: "Candidature", body: "En ligne en 3 minutes" },
  { num: 2, label: "Présélection", body: "Sous 5 jours ouvrés" },
  { num: 3, label: "Entretien manager", body: "Visio ou siège" },
  { num: 4, label: "Test pratique", body: "Mise en situation chantier" },
  { num: 5, label: "Bienvenue", body: "Onboarding sur 2 semaines" },
];

export function RecruitmentProcess({ primaryColor }: { primaryColor: string | null }) {
  const colour = primaryColor ?? "#A855F7";
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold text-ink md:text-3xl">
          Notre processus en 5 étapes
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ink-3">
          Transparent, rapide, respectueux du candidat — vous savez où vous en êtes
          à chaque étape.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, idx) => (
            <div
              key={s.num}
              className="rounded-xl border border-line bg-white p-4 text-center"
            >
              <div
                className="mx-auto grid h-10 w-10 place-items-center rounded-full font-bold text-white"
                style={{ background: colour }}
              >
                {s.num}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">{s.label}</h3>
              <p className="mt-1 text-xs text-ink-3">{s.body}</p>
              {idx < STEPS.length - 1 ? (
                <div className="mx-auto mt-3 hidden h-0.5 w-6 rounded-full bg-line lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
