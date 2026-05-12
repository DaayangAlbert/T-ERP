import Link from "next/link";
import { Download, CalendarPlus, Clock, FolderOpen } from "lucide-react";

interface Props {
  latestPayslipId: string | null;
}

/**
 * 4 actions rapides — grille auto-fit minmax(160px, 1fr).
 * Touch target ≥ 48 px sur chaque carte. Le bouton "Télécharger bulletin"
 * pointe sur l'API PDF (fn 1.2) si un bulletin existe, sinon ouvre l'historique.
 */
export function QuickActionsGrid({ latestPayslipId }: Props) {
  const actions: Array<{
    label: string;
    href: string;
    icon: typeof Download;
    accent: string;
  }> = [
    {
      label: "Télécharger bulletin",
      href: latestPayslipId
        ? `/api/emp/payslips/${latestPayslipId}/pdf`
        : "/emp/paie",
      icon: Download,
      accent: "bg-purple-50 text-purple-700",
    },
    {
      label: "Demander un congé",
      href: "/emp/conges?action=new",
      icon: CalendarPlus,
      accent: "bg-green-50 text-green-700",
    },
    {
      label: "Mes heures du mois",
      href: "/emp/pointage",
      icon: Clock,
      accent: "bg-blue-50 text-blue-700",
    },
    {
      label: "Mes documents",
      href: "/emp/profil#documents",
      icon: FolderOpen,
      accent: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <section
      className="mt-4 grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
    >
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-[68px] items-center gap-3 rounded-xl border border-line bg-white px-3 py-3 shadow-card transition hover:border-purple-300 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-ink">{a.label}</span>
          </Link>
        );
      })}
    </section>
  );
}
