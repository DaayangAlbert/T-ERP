import { CheckCircle2, XCircle, CalendarX2, HeartPulse, CalendarDays } from "lucide-react";
import type { LeaveRequestItem } from "@/hooks/useEmpLeaves";

interface Props {
  items: LeaveRequestItem[];
}

const TYPE_LABEL: Record<string, string> = {
  PAID_LEAVE: "Congés payés",
  RTT: "RTT",
  COMPENSATORY: "Récupération",
  UNPAID: "Sans solde",
  SICK: "Maladie",
  MATERNITY: "Maternité",
  PATERNITY: "Paternité",
  FAMILY: "Événement familial",
  OTHER: "Autre",
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function statusChip(status: string) {
  switch (status) {
    case "RH_APPROVED":
    case "N1_APPROVED":
      return {
        label: "Validé",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700",
      };
    case "REJECTED":
      return {
        label: "Refusé",
        icon: XCircle,
        className: "bg-red-100 text-red-700",
      };
    case "CANCELLED":
      return {
        label: "Annulé",
        icon: CalendarX2,
        className: "bg-slate-200 text-slate-700",
      };
    default:
      return {
        label: status,
        icon: CalendarDays,
        className: "bg-slate-100 text-slate-700",
      };
  }
}

function typeIcon(type: string): typeof CalendarDays {
  return type === "SICK" ? HeartPulse : CalendarDays;
}

/**
 * Historique des congés — items 68 px, icône type 44×44, dates compactes,
 * chip statut coloré, motif rejet en sous-ligne si applicable.
 */
export function LeaveHistoryList({ items }: Props) {
  if (items.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
          Historique de mes congés
        </h2>
        <div className="rounded-xl border border-line bg-white px-4 py-6 text-center text-sm text-ink-3">
          Aucune demande dans l&apos;historique.
        </div>
      </section>
    );
  }
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
        Historique de mes congés
      </h2>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <ul className="divide-y divide-line">
          {items.map((r) => {
            const chip = statusChip(r.status);
            const Icon = typeIcon(r.type);
            const Chip = chip.icon;
            return (
              <li key={r.id} className="flex min-h-[68px] items-center gap-3 px-4 py-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    r.type === "SICK" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {TYPE_LABEL[r.type] ?? r.type} · {r.daysCount} j
                  </p>
                  <p className="text-[11px] text-ink-3">
                    {formatDateShort(r.startDate)} → {formatDateShort(r.endDate)}
                  </p>
                  {r.status === "REJECTED" && r.rejectionReason && (
                    <p className="mt-0.5 truncate text-[11px] text-red-600">
                      Motif : {r.rejectionReason}
                    </p>
                  )}
                  {r.justificationDoc && (
                    <p className="text-[11px] text-ink-3">📎 Certificat fourni</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip.className}`}
                >
                  <Chip className="h-3.5 w-3.5" />
                  {chip.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
