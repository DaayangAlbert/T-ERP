import Link from "next/link";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  items: Array<{
    id: string;
    severity: string;
    priority: string;
    type: string;
    message: string;
    actionUrl: string | null;
    actionLabel: string | null;
  }>;
}

const ICON = { LOW: Info, NORMAL: Info, HIGH: AlertTriangle, URGENT: AlertCircle } as const;
const COLOR = {
  LOW: "border-line bg-white",
  NORMAL: "border-primary-200 bg-primary-50",
  HIGH: "border-warning/40 bg-warning/5",
  URGENT: "border-danger/40 bg-danger/5",
} as const;

export function SiteAlertsList({ items }: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white p-3 shadow-card text-[12.5px] text-ink-3">
        Aucune alerte chantier active.
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Alertes chantier
      </h2>
      {items.map((a) => {
        const Icon = ICON[a.priority as keyof typeof ICON] ?? Info;
        const tone = COLOR[a.priority as keyof typeof COLOR] ?? COLOR.NORMAL;
        return (
          <article
            key={a.id}
            style={{ minHeight: 56 }}
            className={clsx(
              "flex flex-wrap items-center gap-3 rounded-xl border p-3",
              tone
            )}
          >
            <Icon
              className={clsx(
                "h-4 w-4 shrink-0",
                a.priority === "URGENT" ? "text-danger" : a.priority === "HIGH" ? "text-warning" : "text-primary-700"
              )}
            />
            <p className="min-w-0 flex-1 text-[12.5px] font-medium text-ink">{a.message}</p>
            {a.actionUrl && (
              <Link
                href={a.actionUrl}
                style={{ minHeight: 40 }}
                className="inline-flex items-center justify-center rounded-md bg-primary-600 px-3 text-[12px] font-medium text-white hover:bg-primary-700"
              >
                {a.actionLabel ?? "Voir"}
              </Link>
            )}
          </article>
        );
      })}
    </section>
  );
}
