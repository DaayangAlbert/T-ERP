const CLIENTS = [
  "BatimCAM SA",
  "Razel-Bec Cameroun",
  "SOGEA SATOM",
  "Arab Contractors",
  "Constructions Mvog-Mbi",
];

export function ClientLogos() {
  return (
    <section className="border-y border-line bg-surface-alt py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-3">
          Ils nous font confiance
        </p>
        <div className="mt-6 grid grid-cols-2 items-center justify-items-center gap-6 opacity-70 md:grid-cols-5">
          {CLIENTS.map((c) => (
            <div
              key={c}
              className="text-center font-bold text-ink-3 transition-colors hover:text-primary-700"
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
