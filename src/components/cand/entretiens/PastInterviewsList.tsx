import { clsx } from "clsx";
import { Check, X, Clock } from "lucide-react";

export interface PastInterview {
  id: string;
  jobTitle: string;
  scheduledAt: string;
  duration: number;
  mode: "ONSITE" | "VIDEO" | "PHONE";
  decision: "GO" | "NO_GO" | "PENDING" | null;
  completed: boolean;
}

const MODE_LABELS: Record<PastInterview["mode"], string> = {
  ONSITE: "Présentiel",
  VIDEO: "Visio",
  PHONE: "Téléphone",
};

export function PastInterviewsList({
  interviews,
}: {
  interviews: PastInterview[];
}) {
  if (interviews.length === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          Entretiens effectués
        </h3>
        <p className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">
          Aucun entretien passé.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-ink">
        Entretiens effectués
      </h3>
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        {interviews.map((i, idx) => {
          const d = new Date(i.scheduledAt);
          const dateLabel = new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(d);
          const decisionUi = decisionToUi(i.decision, i.completed);
          return (
            <div
              key={i.id}
              className={clsx(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                idx < interviews.length - 1 && "border-b border-line",
              )}
            >
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md bg-surface-alt text-ink-3">
                <decisionUi.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {i.jobTitle}
                </div>
                <div className="text-xs text-ink-3">
                  {dateLabel} · {MODE_LABELS[i.mode]} · {i.duration} min
                </div>
              </div>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  decisionUi.cls,
                )}
              >
                {decisionUi.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function decisionToUi(
  decision: PastInterview["decision"],
  completed: boolean,
): { label: string; cls: string; icon: typeof Check } {
  if (decision === "GO")
    return { label: "Validé", cls: "bg-emerald-100 text-emerald-700", icon: Check };
  if (decision === "NO_GO")
    return { label: "Refusé", cls: "bg-rose-100 text-rose-700", icon: X };
  if (completed)
    return {
      label: "Effectué",
      cls: "bg-ink-3/10 text-ink-2",
      icon: Check,
    };
  return { label: "En attente", cls: "bg-amber-100 text-amber-800", icon: Clock };
}
