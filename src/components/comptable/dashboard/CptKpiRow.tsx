import { ClipboardList, FileText, Clock, AlertTriangle } from "lucide-react";

interface Props {
  kpis: {
    todayEntries: number;
    draftEntries: number;
    invoicesToAccount: number;
    invoicesDueSoon: number;
  };
}

export function CptKpiRow({ kpis }: Props) {
  const items = [
    { label: "Écritures du jour", value: kpis.todayEntries, icon: ClipboardList, color: "text-primary-700" },
    { label: "En brouillard", value: kpis.draftEntries, icon: Clock, color: "text-warning" },
    { label: "Factures à comptabiliser", value: kpis.invoicesToAccount, icon: FileText, color: "text-ink-2" },
    { label: "Échéances J+7", value: kpis.invoicesDueSoon, icon: AlertTriangle, color: "text-danger" },
  ];
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-xl border border-line bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-3">{it.label}</span>
              <Icon className={`h-4 w-4 ${it.color}`} />
            </div>
            <div className="mt-1 text-2xl font-bold text-ink">{it.value}</div>
          </div>
        );
      })}
    </section>
  );
}
