"use client";

import { useQuery } from "@tanstack/react-query";
import { Landmark, Calendar, ClipboardCheck, AlertTriangle, Users } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DgGouvernanceTutorial } from "@/components/help/tutorials/DgGouvernanceTutorial";

const MEETING_TYPE_LABEL: Record<string, string> = {
  BOARD_MEETING: "Conseil d'administration",
  ORDINARY_AG: "AG ordinaire",
  EXTRAORDINARY_AG: "AG extraordinaire",
};

const FUNCTION_LABEL: Record<string, string> = {
  PRESIDENT: "Président",
  VICE_PRESIDENT: "Vice-président",
  CEO: "DG",
  DEPUTY_CEO: "DG adjoint",
  ADMINISTRATOR: "Administrateur",
  TREASURER: "Trésorier",
  SECRETARY: "Secrétaire",
  OTHER: "Autre",
};

const DECISION_TYPE_LABEL: Record<string, string> = {
  APPROVAL: "Approbation",
  RATIFICATION: "Ratification",
  AUTHORIZATION: "Autorisation",
  NOMINATION: "Nomination",
  REVOCATION: "Révocation",
  OTHER: "Autre",
};

interface Summary {
  summary: {
    upcomingMeetings: number;
    pendingDecisions: number;
    mandatesExpiringSoon: number;
    totalActiveMembers: number;
  };
  meetings: Array<{ id: string; type: string; scheduledAt: string; location: string; status: string; daysUntil: number }>;
  decisions: Array<{ id: string; title: string; decisionType: string; followUpStatus: string | null; decidedAt: string; meetingType: string }>;
  boardMembers: Array<{ id: string; fullName: string; function: string; isIndependent: boolean; mandateEndDate: string; daysUntilEnd: number; expiringSoon: boolean }>;
}

export default function DgGouvernancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "governance-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/governance-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="flex items-center gap-2 text-[20px] font-bold text-ink">
            <Landmark className="h-5 w-5 text-violet-600" /> Calendrier &amp; décisions gouvernance
          </h1>
          <p className="text-[12.5px] text-ink-3">Réunions CA/AG à 90 jours · décisions en suivi · mandats administrateurs</p>
        </div>
        <PageHelp title="Aide — Gouvernance"><DgGouvernanceTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Réunions à 90 j" value={data.summary.upcomingMeetings} icon={<Calendar className="h-4 w-4" />} tone="primary" />
        <Kpi label="Décisions en suivi" value={data.summary.pendingDecisions} icon={<ClipboardCheck className="h-4 w-4" />} tone="default" />
        <Kpi label="Mandats expirant <6 mois" value={data.summary.mandatesExpiringSoon} icon={<AlertTriangle className="h-4 w-4" />} tone={data.summary.mandatesExpiringSoon > 0 ? "warn" : "ok"} />
        <Kpi label="Administrateurs actifs" value={data.summary.totalActiveMembers} icon={<Users className="h-4 w-4" />} tone="default" />
      </div>

      <Section title={`Réunions à venir (${data.meetings.length})`}>
        {data.meetings.length === 0 ? (
          <Empty>Aucune réunion programmée dans les 90 prochains jours.</Empty>
        ) : (
          <Table headers={["Type", "Date", "Dans", "Lieu", "Statut"]}>
            {data.meetings.map((m) => (
              <tr key={m.id} className="border-t border-line hover:bg-surface-alt">
                <td className="py-2.5 pl-3 font-semibold text-ink">{MEETING_TYPE_LABEL[m.type] ?? m.type}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{new Date(m.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className={clsx("py-2.5 text-right font-mono tabular-nums", m.daysUntil <= 14 && "font-bold text-amber-700")}>{m.daysUntil} j</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{m.location}</td>
                <td className="py-2.5 pr-3 text-[10.5px]"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">{m.status}</span></td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={`Mandats administrateurs (${data.boardMembers.length})`}>
        {data.boardMembers.length === 0 ? (
          <Empty>Aucun administrateur actif.</Empty>
        ) : (
          <Table headers={["Nom", "Fonction", "Indép.", "Fin de mandat", "Reste"]}>
            {data.boardMembers.map((m) => (
              <tr key={m.id} className={clsx("border-t border-line hover:bg-surface-alt", m.expiringSoon && "bg-amber-50/40")}>
                <td className="py-2.5 pl-3 font-semibold text-ink">{m.fullName}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{FUNCTION_LABEL[m.function] ?? m.function}</td>
                <td className="py-2.5 text-[11px]">{m.isIndependent ? <span className="rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-700">oui</span> : <span className="text-ink-3">—</span>}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{new Date(m.mandateEndDate).toLocaleDateString("fr-FR")}</td>
                <td className={clsx("py-2.5 pr-3 text-right font-mono tabular-nums", m.expiringSoon && "font-bold text-amber-700")}>{m.daysUntilEnd} j</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={`Décisions à suivre (${data.decisions.length})`}>
        {data.decisions.length === 0 ? (
          <Empty>Aucune décision en cours de suivi.</Empty>
        ) : (
          <Table headers={["Titre", "Type", "Origine", "Décidée le", "Statut suivi"]}>
            {data.decisions.map((d) => (
              <tr key={d.id} className="border-t border-line hover:bg-surface-alt">
                <td className="py-2.5 pl-3 text-ink">{d.title}</td>
                <td className="py-2.5 text-[11px]"><span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">{DECISION_TYPE_LABEL[d.decisionType] ?? d.decisionType}</span></td>
                <td className="py-2.5 text-[11.5px] text-ink-3">{MEETING_TYPE_LABEL[d.meetingType] ?? d.meetingType}</td>
                <td className="py-2.5 text-[11.5px] text-ink-2">{new Date(d.decidedAt).toLocaleDateString("fr-FR")}</td>
                <td className="py-2.5 pr-3 text-[11px]">{d.followUpStatus ?? <span className="text-ink-3">—</span>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "primary" | "default" | "ok" | "warn" }) {
  const cls = { primary: "border-l-violet-500", default: "border-l-slate-400", ok: "border-l-emerald-500", warn: "border-l-amber-500" }[tone];
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
      <table className="w-full min-w-[640px] text-[12.5px]">
        <thead className="bg-white text-[10.5px] uppercase tracking-wide text-ink-3">
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={clsx("py-2", i === 0 ? "pl-3 text-left" : i === headers.length - 1 ? "pr-3 text-right" : "text-left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
