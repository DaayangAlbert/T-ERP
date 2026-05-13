import { clsx } from "clsx";

interface Props {
  items: Array<{
    id: string;
    reference: string;
    description: string;
    journalCode: string;
    entryDate: string;
    siteCode: string | null;
    status: string;
  }>;
}

export function CptActivityTimeline({ items }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Activité comptable récente
      </h2>
      {items.length === 0 ? (
        <p className="p-3 text-[12.5px] text-ink-3">Aucune écriture saisie récemment.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((e) => (
            <li key={e.id} className="flex items-start gap-3 p-3 text-[12.5px]">
              <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {e.journalCode}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-ink">{e.reference}</span>
                  {e.siteCode && <span className="text-[11.5px] text-ink-3">{e.siteCode}</span>}
                </div>
                <p className="text-ink-2">{e.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[11px] text-ink-3">
                  {new Date(e.entryDate).toLocaleDateString("fr-FR")}
                </span>
                <span
                  className={clsx(
                    "rounded px-2 py-0.5 text-[11px] font-medium",
                    e.status === "DRAFT" && "bg-warning/10 text-warning",
                    e.status === "VALIDATED" && "bg-success/10 text-success",
                    e.status === "CANCELLED" && "bg-ink-3/10 text-ink-3"
                  )}
                >
                  {e.status === "DRAFT" ? "Brouillard" : e.status === "VALIDATED" ? "Validée" : "Annulée"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
