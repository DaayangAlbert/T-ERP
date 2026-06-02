"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, Archive, Award } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DgConformiteTutorial } from "@/components/help/tutorials/DgConformiteTutorial";

const APPROVAL_STATUS_CLS: Record<string, string> = {
  VALID: "bg-emerald-100 text-emerald-800",
  EXPIRING_SOON: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-rose-100 text-rose-800",
  RENEWED: "bg-slate-100 text-slate-700",
};
const REGISTER_STATUS_CLS: Record<string, string> = {
  UP_TO_DATE: "bg-emerald-100 text-emerald-800",
  TO_UPDATE: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-rose-100 text-rose-800",
};
const REGISTER_TYPE_LABEL: Record<string, string> = {
  AG_DECISIONS: "Registre AG",
  SHAREHOLDERS: "Registre actionnaires",
  BOARD_DECISIONS: "Registre CA",
  PERSONNEL: "Registre personnel",
  HSE_SITES: "Registre HSE chantiers",
  REGULATED_AGREEMENTS: "Conventions réglementées",
  BANK_GUARANTEES: "Cautions",
  PUBLIC_MARKETS: "Marchés publics",
};

interface Summary {
  summary: {
    totalApprovals: number;
    approvalsExpiring: number;
    certifications: number;
    certsExpiring: number;
    registers: number;
    registersOverdue: number;
    registersToUpdate: number;
  };
  approvals: Array<{ id: string; approvalName: string; deliveringAuthority: string; approvalNumber: string; issuedAt: string; expiresAt: string; daysUntilExpiry: number; renewable: boolean; status: string }>;
  certifications: Array<{ id: string; standard: string; scope: string | null; issuedBy: string; issuedAt: string; validUntil: string; daysUntilExpiry: number; surveillanceAuditDate: string | null; openNcCount: number }>;
  registers: Array<{ id: string; registerType: string; name: string; legalBasis: string; responsible: string; entriesCount: number; lastEntryDate: string | null; nextReviewDate: string; status: string }>;
}

export default function DgConformitePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "compliance-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/compliance-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const alertsCount = data.summary.approvalsExpiring + data.summary.certsExpiring + data.summary.registersOverdue;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
            <ShieldCheck className="h-5 w-5 text-violet-600" /> Conformité &amp; agréments
          </h1>
          <p className="text-[12.5px] text-ink-3">Agréments professionnels · certifications ISO · registres réglementaires</p>
        </div>
        <PageHelp title="Aide — Conformité &amp; agréments"><DgConformiteTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Agréments à renouveler <60 j" value={data.summary.approvalsExpiring} icon={<Award className="h-4 w-4" />} tone={data.summary.approvalsExpiring > 0 ? "warn" : "ok"} />
        <Kpi label="Certifs ISO à renouveler <60 j" value={data.summary.certsExpiring} icon={<ShieldCheck className="h-4 w-4" />} tone={data.summary.certsExpiring > 0 ? "warn" : "ok"} />
        <Kpi label="Registres en retard" value={data.summary.registersOverdue} icon={<AlertTriangle className="h-4 w-4" />} tone={data.summary.registersOverdue > 0 ? "danger" : "ok"} />
        <Kpi label="Total alertes" value={alertsCount} icon={<Archive className="h-4 w-4" />} tone={alertsCount > 0 ? "warn" : "ok"} />
      </div>

      <Section title={`Agréments professionnels (${data.approvals.length})`}>
        {data.approvals.length === 0 ? <Empty>Aucun agrément enregistré.</Empty> : (
          <Table headers={["Agrément", "Autorité", "N°", "Émission", "Expiration", "Reste", "Statut"]}>
            {data.approvals.map((a) => (
              <tr key={a.id} className={clsx("border-t border-line hover:bg-surface-alt", a.daysUntilExpiry <= 60 && a.daysUntilExpiry >= 0 && "bg-amber-50/30")}>
                <td className="py-2.5 pl-3 font-semibold text-ink">{a.approvalName}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{a.deliveringAuthority}</td>
                <td className="py-2.5 font-mono text-[10.5px]">{a.approvalNumber}</td>
                <td className="py-2.5 text-[11px] text-ink-3">{new Date(a.issuedAt).toLocaleDateString("fr-FR")}</td>
                <td className="py-2.5 text-[11px] text-ink-2">{new Date(a.expiresAt).toLocaleDateString("fr-FR")}</td>
                <td className={clsx("py-2.5 text-right font-mono tabular-nums text-[11px]", a.daysUntilExpiry <= 60 && "font-bold text-amber-700", a.daysUntilExpiry < 0 && "text-rose-700")}>{a.daysUntilExpiry >= 0 ? `${a.daysUntilExpiry} j` : "expiré"}</td>
                <td className="py-2.5 pr-3"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", APPROVAL_STATUS_CLS[a.status] ?? "bg-slate-100 text-slate-700")}>{a.status}</span></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={`Certifications ISO (${data.certifications.length})`}>
        {data.certifications.length === 0 ? <Empty>Aucune certification.</Empty> : (
          <Table headers={["Norme", "Périmètre", "Organisme", "Validité", "Reste", "Audit suivi", "NC ouvertes"]}>
            {data.certifications.map((c) => (
              <tr key={c.id} className={clsx("border-t border-line hover:bg-surface-alt", c.daysUntilExpiry <= 60 && c.daysUntilExpiry >= 0 && "bg-amber-50/30")}>
                <td className="py-2.5 pl-3 font-bold text-violet-700">{c.standard}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{c.scope ?? "—"}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{c.issuedBy}</td>
                <td className="py-2.5 text-[11px] text-ink-2">{new Date(c.validUntil).toLocaleDateString("fr-FR")}</td>
                <td className={clsx("py-2.5 text-right font-mono tabular-nums text-[11px]", c.daysUntilExpiry <= 60 && "font-bold text-amber-700", c.daysUntilExpiry < 0 && "text-rose-700")}>{c.daysUntilExpiry >= 0 ? `${c.daysUntilExpiry} j` : "expirée"}</td>
                <td className="py-2.5 text-[11px] text-ink-3">{c.surveillanceAuditDate ? new Date(c.surveillanceAuditDate).toLocaleDateString("fr-FR") : "—"}</td>
                <td className={clsx("py-2.5 pr-3 text-right font-mono tabular-nums", c.openNcCount > 0 && "font-bold text-rose-700")}>{c.openNcCount}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={`Registres réglementaires (${data.registers.length})`}>
        {data.registers.length === 0 ? <Empty>Aucun registre.</Empty> : (
          <Table headers={["Registre", "Type", "Responsable", "Entrées", "Prochaine revue", "Statut"]}>
            {data.registers.map((r) => (
              <tr key={r.id} className={clsx("border-t border-line hover:bg-surface-alt", r.status === "OVERDUE" && "bg-rose-50/30")}>
                <td className="py-2.5 pl-3">
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-[10px] text-ink-3">{r.legalBasis}</div>
                </td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{REGISTER_TYPE_LABEL[r.registerType] ?? r.registerType}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{r.responsible}</td>
                <td className="py-2.5 text-right font-mono tabular-nums">{r.entriesCount}</td>
                <td className="py-2.5 text-[11px] text-ink-2">{new Date(r.nextReviewDate).toLocaleDateString("fr-FR")}</td>
                <td className="py-2.5 pr-3"><span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", REGISTER_STATUS_CLS[r.status] ?? "bg-slate-100 text-slate-700")}>{r.status}</span></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "ok" | "warn" | "danger" }) {
  const cls = { ok: "border-l-emerald-500", warn: "border-l-amber-500", danger: "border-l-rose-500" }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white shadow-card">
      <h2 className="border-b border-line bg-surface-alt px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-ink-2">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-6 text-center text-[12px] italic text-ink-3">{children}</p>;
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-[12.5px]">
        <thead className="bg-white text-[10.5px] uppercase tracking-wide text-ink-3">
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={clsx("py-2", i === 0 ? "pl-3 text-left" : i === headers.length - 1 ? "pr-3 text-left" : "text-left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
