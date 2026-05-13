import { clsx } from "clsx";

interface Props {
  physicalProgress: number;
  financialProgress: number;
  margin: number;
  plannedEndDate: string;
}

export function SiteStateBanner({ physicalProgress, financialProgress, margin, plannedEndDate }: Props) {
  const items = [
    {
      label: "Avancement physique",
      value: `${physicalProgress}%`,
      tone: physicalProgress >= 70 ? "ok" : physicalProgress >= 40 ? "warning" : "danger",
    },
    {
      label: "Avancement financier",
      value: `${financialProgress}%`,
      tone: Math.abs(physicalProgress - financialProgress) <= 10 ? "ok" : "warning",
    },
    {
      label: "Marge réelle",
      value: `${margin.toFixed(1)}%`,
      tone: margin >= 7 ? "ok" : margin >= 4 ? "warning" : "danger",
    },
    {
      label: "Livraison prévue",
      value: new Date(plannedEndDate).toLocaleDateString("fr-FR"),
      tone: "info",
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className={clsx(
            "rounded-xl border p-3 shadow-card",
            it.tone === "ok" && "border-success/30 bg-success/5",
            it.tone === "warning" && "border-warning/30 bg-warning/5",
            it.tone === "danger" && "border-danger/30 bg-danger/5",
            it.tone === "info" && "border-line bg-white"
          )}
        >
          <div className="text-[11px] uppercase tracking-wider text-ink-3">{it.label}</div>
          <div
            className={clsx(
              "mt-1 text-2xl font-bold",
              it.tone === "ok" && "text-success",
              it.tone === "warning" && "text-warning",
              it.tone === "danger" && "text-danger",
              it.tone === "info" && "text-ink"
            )}
          >
            {it.value}
          </div>
        </div>
      ))}
    </section>
  );
}
