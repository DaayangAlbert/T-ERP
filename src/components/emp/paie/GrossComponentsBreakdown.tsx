interface Props {
  detail: {
    workedDays: number;
    reportedHours: number;
    baseSalary: number | null;
    overtimeAmount: number;
    overtimeHours: number;
    overtimeHours125: number;
    overtimeHours150: number;
    overtimeHours200: number;
    seniorityBonus: number;
    transportAllowance: number;
    grossAmount: number;
  };
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Détail des composantes du brut. Affiché en card blanche, lignes séparées,
 * total brut surligné. Lisible pour vérification rapide par l'ouvrier.
 */
export function GrossComponentsBreakdown({ detail }: Props) {
  const overtimeBreakdown = [
    detail.overtimeHours125 > 0 ? `${detail.overtimeHours125} h × 125 %` : null,
    detail.overtimeHours150 > 0 ? `${detail.overtimeHours150} h × 150 %` : null,
    detail.overtimeHours200 > 0 ? `${detail.overtimeHours200} h × 200 %` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: Array<{ label: string; sub: string | null; amount: number }> = [
    {
      label: "Salaire de base",
      sub: `${detail.workedDays} j travaillés · ${detail.reportedHours} h`,
      amount: detail.baseSalary ?? 0,
    },
  ];
  if (detail.overtimeAmount > 0) {
    lines.push({
      label: "Heures supplémentaires",
      sub: overtimeBreakdown || `${detail.overtimeHours} h`,
      amount: detail.overtimeAmount,
    });
  }
  if (detail.seniorityBonus > 0) {
    lines.push({ label: "Prime d'ancienneté", sub: null, amount: detail.seniorityBonus });
  }
  if (detail.transportAllowance > 0) {
    lines.push({ label: "Indemnité transport", sub: null, amount: detail.transportAllowance });
  }

  return (
    <section className="mt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
        Composantes du brut
      </h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.label} className="flex items-start justify-between px-4 py-3">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-sm font-medium text-ink">{l.label}</p>
                {l.sub && <p className="text-[11px] text-ink-3">{l.sub}</p>}
              </div>
              <span className="whitespace-nowrap text-sm font-semibold text-ink">
                {formatFcfa(l.amount)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between bg-purple-50 px-4 py-3">
          <span className="text-sm font-semibold text-purple-800">Total brut</span>
          <span className="text-base font-bold text-purple-800">{formatFcfa(detail.grossAmount)}</span>
        </div>
      </div>
    </section>
  );
}
