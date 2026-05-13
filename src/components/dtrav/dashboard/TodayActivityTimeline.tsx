import { ClipboardList, FileText, Truck, Users } from "lucide-react";

interface Props {
  items: Array<{ kind: string; label: string; time: string }>;
}

const ICONS = {
  report: ClipboardList,
  entry: FileText,
  delivery: Truck,
  presence: Users,
} as const;

export function TodayActivityTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white p-3 shadow-card text-[12.5px] text-ink-3">
        Aucune activité enregistrée aujourd&apos;hui.
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Activité du jour
      </h2>
      <ul className="divide-y divide-line">
        {items.map((it, idx) => {
          const Icon = (ICONS as Record<string, typeof ClipboardList>)[it.kind] ?? FileText;
          return (
            <li key={idx} className="flex items-start gap-3 p-3 text-[12.5px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-700">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-ink-2">{it.label}</div>
                <div className="text-[11px] text-ink-3">
                  {new Date(it.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
