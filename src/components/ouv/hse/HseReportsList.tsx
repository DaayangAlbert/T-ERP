"use client";

import type { HseReportItem } from "@/hooks/useOuvHse";

interface Props {
  reports: HseReportItem[];
}

// Liste compacte "Mes signalements récents" : chaque ligne avec emoji du
// type, titre, date + destinataire, chip statut coloré, ligne résolution
// si présent.
const STATUS_META: Record<HseReportItem["status"], { label: string; tone: string }> = {
  OPEN: { label: "⏳ Ouvert", tone: "bg-amber-50 text-amber-800" },
  INVESTIGATING: { label: "🔍 Enquête", tone: "bg-blue-50 text-blue-700" },
  IN_PROGRESS: { label: "🛠 En traitement", tone: "bg-purple-50 text-purple-700" },
  RESOLVED: { label: "✓ Traité", tone: "bg-emerald-50 text-emerald-700" },
  CLOSED: { label: "✓ Clôturé", tone: "bg-slate-100 text-slate-600" },
};

export function HseReportsList({ reports }: Props) {
  if (!reports.length) return null;
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">Mes signalements récents</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {reports.map((r, idx) => (
          <Row key={r.id} report={r} isLast={idx === reports.length - 1} />
        ))}
      </div>
    </section>
  );
}

function Row({ report, isLast }: { report: HseReportItem; isLast: boolean }) {
  const meta = STATUS_META[report.status];
  return (
    <div className={`min-h-[74px] px-4 py-3.5 ${!isLast ? "border-b border-slate-100" : ""}`}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-[14px] font-bold text-slate-900">
          {report.typeEmoji} {report.title}
        </p>
        <span className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>
          {meta.label}
        </span>
      </div>
      <p className="truncate text-[12px] text-slate-500">
        {formatDate(report.createdAt)}
        {report.assignedToName && ` · ${roleLabel(report.assignedToRole)} ${report.assignedToName}`}
        {report.photosCount > 0 && ` · ${report.photosCount} photo${report.photosCount > 1 ? "s" : ""}`}
        {report.isAnonymous && " · 🛡 anonyme"}
      </p>
      {report.resolution && (
        <p className="mt-1 text-[12px] font-medium text-emerald-700">{report.resolution}</p>
      )}
      {report.reportedToCnps && (
        <p className="mt-1 text-[11px] font-medium text-rose-700">
          📋 CNPS notifiée le {formatDate(report.reportedToCnpsAt!)}
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function roleLabel(role: string | null): string {
  if (!role) return "";
  if (role === "WORKS_DIRECTOR") return "DTrav";
  if (role === "SITE_MANAGER") return "CC";
  if (role === "WAREHOUSE") return "Magasinier";
  if (role === "HR") return "RH";
  return role;
}
