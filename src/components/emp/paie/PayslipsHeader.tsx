interface Props {
  year: number;
  total: number;
  cumulNet: number;
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export function PayslipsHeader({ year, total, cumulNet }: Props) {
  return (
    <header className="mt-4 rounded-2xl border border-line bg-white p-4 shadow-card">
      <p className="text-[11px] uppercase tracking-wider text-ink-3">
        Historique de mes bulletins
      </p>
      <h1 className="mt-1 text-lg font-semibold text-ink">
        Année {year} · {total} bulletin{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
      </h1>
      <p className="mt-1 text-sm text-ink-2">
        Cumul net :{" "}
        <span className="font-semibold text-purple-700">{formatFcfa(cumulNet)}</span>
      </p>
    </header>
  );
}
