"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, FileText, Download, AlertOctagon, X } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravRapportsCdtTutorial } from "@/components/help/tutorials/DtravRapportsCdtTutorial";

interface ListItem {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string | null;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
  author: string;
  sitesCount: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
}

interface ReportDetail extends Omit<ListItem, "author"> {
  /**
   * Le détail API renvoie un objet (id + nom complet + poste) là où la
   * liste ne renvoie que le nom déjà concaténé. Nécessite donc `Omit`
   * pour pouvoir restreindre le shape hérité de ListItem.
   */
  author: { id: string; name: string; position: string | null };
  workingDays: number;
  weatherDays: number;
  subcontractorsPresent: number;
  globalSummary: string | null;
  keyAchievements: string | null;
  transverseIssues: string | null;
  scheduleSlippages: string | null;
  arbitrationsNeeded: string | null;
  nextWeekPlan: string | null;
  sites: Array<{
    siteId: string;
    site: { code: string; name: string };
    physicalProgressPercent: number;
    financialProgressPercent: number;
    valueProducedXAF: string;
    avgWorkforce: number;
    hseIncidentsCount: number;
    milestonesAchieved: string | null;
    milestonesAtRisk: string | null;
    notes: string | null;
  }>;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} → ${e.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

function fmtFCFA(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

export default function DtravCdtReportsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "cdt-reports", "submitted"],
    queryFn: () => getJson<{ items: ListItem[] }>(`/api/cdt/weekly-reports?status=SUBMITTED`),
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="text-[20px] font-bold text-ink">Rapports hebdomadaires CDT à valider</h1>
          <p className="text-[12.5px] text-ink-3">
            Validation N+1 des rapports consolidés des Conducteurs de Travaux
          </p>
        </div>
        <PageHelp title="Aide — Rapports CDT"><DtravRapportsCdtTutorial /></PageHelp>
      </header>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : (data?.items ?? []).length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun rapport en attente</p>
          <p className="mt-1 text-[12px] text-ink-3">Tous les rapports CDT soumis ont été traités.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data!.items.map((r) => (
            <ReportCard key={r.id} item={r} onOpen={() => setSelected(r.id)} />
          ))}
        </div>
      )}

      {selected && (
        <ReviewModal
          reportId={selected}
          onClose={() => {
            setSelected(null);
            setRejecting(false);
          }}
          rejecting={rejecting}
          setRejecting={setRejecting}
        />
      )}
    </div>
  );
}

function ReportCard({ item, onOpen }: { item: ListItem; onOpen: () => void }) {
  const submitted = item.submittedAt ? new Date(item.submittedAt) : null;
  const ageDays = submitted ? Math.floor((Date.now() - submitted.getTime()) / 86_400_000) : null;

  return (
    <article className="rounded-xl border border-line bg-white p-3.5 shadow-card">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-bold text-ink">{item.weekLabel ?? fmtRange(item.weekStart, item.weekEnd)}</h3>
          <p className="text-[11px] text-ink-3">
            {fmtRange(item.weekStart, item.weekEnd)} · Auteur : {item.author}
          </p>
        </div>
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">À valider</span>
      </header>

      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-2">
        <span><FileText className="inline h-3 w-3" /> {item.sitesCount} chantier{item.sitesCount > 1 ? "s" : ""}</span>
        {ageDays !== null && (
          <span className={clsx(ageDays > 3 ? "text-amber-700 font-semibold" : "text-ink-3")}>
            Soumis il y a {ageDays} jour{ageDays > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700"
      >
        Examiner & décider
      </button>
    </article>
  );
}

function ReviewModal({
  reportId,
  onClose,
  rejecting,
  setRejecting,
}: {
  reportId: string;
  onClose: () => void;
  rejecting: boolean;
  setRejecting: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["dtrav", "cdt-report", reportId],
    queryFn: () => getJson<ReportDetail>(`/api/cdt/weekly-reports/${reportId}`),
  });

  const validate = useMutation({
    mutationFn: () => getJson(`/api/cdt/weekly-reports/${reportId}/validate`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav"] });
      onClose();
    },
  });

  const reject = useMutation({
    mutationFn: () =>
      getJson(`/api/cdt/weekly-reports/${reportId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Examen rapport hebdomadaire CDT</h2>
            {report && (
              <p className="text-[12px] text-ink-3">
                Auteur : {report.author.name}
                {report.author.position ? ` · ${report.author.position}` : ""} · {fmtRange(report.weekStart, report.weekEnd)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {report && (
              <a
                href={`/api/cdt/weekly-reports/${reportId}/pdf`}
                target="_blank"
                rel="noopener"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[12px] hover:bg-surface-alt"
              >
                <Download className="h-3 w-3" /> PDF
              </a>
            )}
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading || !report ? (
            <div className="h-64 animate-pulse rounded-md bg-surface-alt" />
          ) : (
            <>
              <SectionView title="Cadre semaine">
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <KV label="Jours travaillés" value={`${report.workingDays} / 7`} />
                  <KV label="Jours intempéries" value={`${report.weatherDays} / 7`} />
                  <KV label="Sous-traitants présents" value={String(report.subcontractorsPresent)} />
                </div>
              </SectionView>

              <SectionView title={`Chantiers couverts (${report.sites.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-[11.5px]">
                    <thead className="bg-surface-alt text-[10px] uppercase text-ink-3">
                      <tr>
                        <th className="py-1.5 pl-2 text-left">Chantier</th>
                        <th className="py-1.5 text-right">% phys.</th>
                        <th className="py-1.5 text-right">% fin.</th>
                        <th className="py-1.5 text-right">Val. produite</th>
                        <th className="py-1.5 text-right">Effct.</th>
                        <th className="py-1.5 pr-2 text-right">HSE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sites.map((s) => (
                        <tr key={s.siteId} className="border-t border-line">
                          <td className="py-1.5 pl-2">
                            <div className="font-bold text-ink">{s.site.code}</div>
                            <div className="text-[10px] text-ink-3">{s.site.name}</div>
                          </td>
                          <td className="py-1.5 text-right font-mono">{s.physicalProgressPercent.toFixed(1)}</td>
                          <td className="py-1.5 text-right font-mono">{s.financialProgressPercent.toFixed(1)}</td>
                          <td className="py-1.5 text-right font-mono">{fmtFCFA(s.valueProducedXAF)}</td>
                          <td className="py-1.5 text-right font-mono">{s.avgWorkforce}</td>
                          <td className={clsx("py-1.5 pr-2 text-right font-mono", s.hseIncidentsCount > 0 && "font-bold text-rose-700")}>{s.hseIncidentsCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionView>

              <Narrative title="Synthèse globale" text={report.globalSummary} />
              <Narrative title="Réalisations clés transverses" text={report.keyAchievements} />
              <Narrative title="Difficultés & risques transverses" text={report.transverseIssues} />
              <Narrative title="Glissements & jalons à risque" text={report.scheduleSlippages} />
              <Narrative title="Arbitrages demandés" text={report.arbitrationsNeeded} highlight />
              <Narrative title="Programme semaine suivante" text={report.nextWeekPlan} />
            </>
          )}
        </div>

        {/* Footer décision */}
        <div className="border-t border-line p-4">
          {!rejecting ? (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejecting(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                <XCircle className="h-4 w-4" /> Refuser
              </button>
              <button
                onClick={() => validate.mutate()}
                disabled={validate.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> {validate.isPending ? "Validation..." : "Valider le rapport"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">
                  Motif du refus <span className="text-rose-600">*</span>
                </span>
                <textarea
                  required
                  rows={3}
                  minLength={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Décrivez précisément les corrections attendues..."
                  className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]"
                />
              </label>
              {reject.error && (
                <p className="text-[11.5px] text-rose-700">{(reject.error as Error).message}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejecting(false)}
                  className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt"
                >
                  Annuler
                </button>
                <button
                  onClick={() => reject.mutate()}
                  disabled={reason.length < 5 || reject.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[12.5px] font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" /> {reject.isPending ? "Refus..." : "Confirmer le refus"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionView({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface-alt/30 p-3">
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-violet-700">{title}</h3>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10.5px] uppercase tracking-wide text-ink-3">{label}</span>
      <span className="text-[13px] font-bold text-ink">{value}</span>
    </div>
  );
}

function Narrative({ title, text, highlight }: { title: string; text: string | null; highlight?: boolean }) {
  if (!text || !text.trim()) {
    return (
      <SectionView title={title}>
        <p className="text-[12px] italic text-ink-3">— Non renseigné —</p>
      </SectionView>
    );
  }
  return (
    <section className={clsx("rounded-lg border p-3", highlight ? "border-amber-300 bg-amber-50" : "border-line bg-surface-alt/30")}>
      <div className={clsx("mb-1 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide", highlight ? "text-amber-800" : "text-violet-700")}>
        {highlight && <AlertOctagon className="h-3 w-3" />}
        {title}
      </div>
      {text.split(/\n+/).map((line, i) =>
        line.trim() ? (
          <p key={i} className="text-[12px] leading-snug text-ink-2">
            {line.trim()}
          </p>
        ) : null,
      )}
    </section>
  );
}
