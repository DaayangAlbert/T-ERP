import { clsx } from "clsx";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface Props {
  items: Array<{ kind: string; label: string; severity: "info" | "warning" | "danger" }>;
}

const SEVERITY_STYLE = {
  info: { bg: "bg-primary-50 border-primary-200 text-primary-700", icon: Info },
  warning: { bg: "bg-warning/5 border-warning/30 text-warning", icon: AlertTriangle },
  danger: { bg: "bg-danger/5 border-danger/30 text-danger", icon: AlertCircle },
} as const;

export function CptPrioritiesList({ items }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white p-3 shadow-card">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Mes priorités du jour
      </h2>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucune priorité urgente. Bonne journée !</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, idx) => {
            const s = SEVERITY_STYLE[it.severity];
            const Icon = s.icon;
            return (
              <li
                key={idx}
                className={clsx(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px] font-medium",
                  s.bg
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{it.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
