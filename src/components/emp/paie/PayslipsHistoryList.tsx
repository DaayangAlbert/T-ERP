import { ChevronRight } from "lucide-react";

interface Item {
  id: string;
  period: string;
  periodLabel: string | null;
  netAmount: number;
}

interface Props {
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MONTH_LABEL_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTH_LABEL_FULL = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function monthAndYear(label: string | null, period: string): { short: string; full: string; year: string } {
  if (label) {
    const [y, m] = label.split("-");
    const idx = Number(m) - 1;
    return { short: MONTH_LABEL_SHORT[idx] ?? m, full: MONTH_LABEL_FULL[idx] ?? m, year: y };
  }
  const d = new Date(period);
  return {
    short: MONTH_LABEL_SHORT[d.getMonth()],
    full: MONTH_LABEL_FULL[d.getMonth()],
    year: String(d.getFullYear()),
  };
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

/**
 * Liste des bulletins de l'année. Items 68 px de haut. Icône mois 44×44
 * en cercle violet. Le bulletin sélectionné est surligné en violet doux.
 */
export function PayslipsHistoryList({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return null;
  }
  const year = monthAndYear(items[0].periodLabel, items[0].period).year;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
        Historique {year}
      </h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <ul className="divide-y divide-line">
          {items.map((p) => {
            const { short, full, year: yr } = monthAndYear(p.periodLabel, p.period);
            const selected = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={`flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition ${
                    selected ? "bg-purple-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full text-[10px] font-semibold ${
                      selected ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    <span>{short}</span>
                    <span className="text-[9px] opacity-80">{yr}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {full} {yr}
                    </p>
                    <p className="text-[11px] text-ink-3">Net versé</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-purple-700">
                      {formatFcfa(p.netAmount)}
                    </span>
                  </div>
                  <ChevronRight className="ml-1 h-4 w-4 text-ink-3" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
