"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Plus,
  Banknote,
  CheckCircle2,
  Building2,
  MapPin,
  User,
  CalendarClock,
  Briefcase,
  Gavel,
} from "lucide-react";
import { clsx } from "clsx";
import type { LegalCaseEventEntry } from "@/hooks/useSgLegalCases";
import { useLegalCaseDetail } from "@/hooks/useSgLegalCases";
import { LegalEventTimeline } from "./LegalEventTimeline";
import { EventAddModal } from "./EventAddModal";
import { ProvisionAdjustmentModal } from "./ProvisionAdjustmentModal";
import { CloseLegalCaseModal } from "./CloseLegalCaseModal";

interface Props {
  caseId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

type Tab = "identity" | "timeline" | "documents";

const POSITION_LABEL: Record<string, string> = {
  DEMANDEUR: "Demandeur",
  DEFENDEUR: "Défendeur",
  MEDIATION: "Médiation",
  ARBITRATION: "Arbitrage",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Ouvert",
  MEDIATION: "Médiation",
  COURT_PENDING: "En instance",
  APPEAL: "Appel",
  SUPREME_COURT: "Cassation",
  SETTLED: "Transigé",
  WON: "Gagné",
  LOST: "Perdu",
  ABANDONED: "Abandonné",
};

const CLOSED_STATUSES = ["SETTLED", "WON", "LOST", "ABANDONED"];

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function LegalCaseDetailDrawer({ caseId, readOnly, onClose }: Props) {
  const { data, isLoading } = useLegalCaseDetail(caseId);
  const [tab, setTab] = useState<Tab>("identity");
  const [showEvent, setShowEvent] = useState(false);
  const [showProvision, setShowProvision] = useState(false);
  const [showClose, setShowClose] = useState(false);

  if (!caseId) return null;

  const isClosed = data ? CLOSED_STATUSES.includes(data.status) : false;
  const documents: LegalCaseEventEntry[] = data?.events.filter((e) => Boolean(e.documentUrl)) ?? [];

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {data ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10.5px] font-bold text-ink-3">{data.reference}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                      data.urgencyTone === "rose"
                        ? "bg-rose-100 text-rose-700"
                        : data.urgencyTone === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : data.urgencyTone === "slate"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-violet-100 text-violet-700",
                    )}
                  >
                    {STATUS_LABEL[data.status] ?? data.status}
                  </span>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                    {POSITION_LABEL[data.ourPosition] ?? data.ourPosition}
                  </span>
                </div>
                <h2 className="mt-1 text-[14px] font-bold text-ink">{data.title}</h2>
              </>
            ) : (
              <h2 className="text-[14px] font-bold text-ink">Chargement…</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="flex shrink-0 gap-1 border-b border-line bg-surface-alt/40 px-2 py-1.5">
          {([
            { id: "identity", label: "Identité" },
            { id: "timeline", label: `Timeline (${data?.events.length ?? 0})` },
            { id: "documents", label: `Pièces (${documents.length})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition",
                tab === t.id ? "bg-violet-600 text-white" : "text-ink-3 hover:bg-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : tab === "identity" ? (
            <div className="space-y-3">
              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Parties</h3>
                <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                  <Row icon={Building2} label="Partie adverse" value={data.opposingParty} />
                  <Row icon={MapPin} label="Juridiction" value={data.jurisdiction} />
                  {data.caseNumber && <Row icon={Gavel} label="N° dossier" value={data.caseNumber} />}
                  {data.relatedContract && (
                    <Row
                      icon={Briefcase}
                      label="Marché lié"
                      value={`${data.relatedContract.reference} · ${data.relatedContract.title}`}
                    />
                  )}
                </dl>
              </section>

              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Financier (IFRS)</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Enjeu" value={`${fmtFcfa(data.amountAtStake)} FCFA`} />
                  <Stat label="Provision" value={`${fmtFcfa(data.provisionAmount)} FCFA`} tone="amber" />
                  <Stat
                    label="Couverture"
                    value={`${data.amountAtStake > 0 ? Math.round((data.provisionAmount / data.amountAtStake) * 100) : 0}%`}
                  />
                </dl>
              </section>

              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Avocat</h3>
                <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                  <Row icon={User} label="Conseil" value={data.lawyerName} />
                  <Row icon={Briefcase} label="Cabinet" value={data.lawFirm} />
                  <Row
                    icon={CalendarClock}
                    label="Prochaine audience"
                    value={data.nextHearingDate ? fmtDate(data.nextHearingDate) : "Non planifiée"}
                  />
                </dl>
              </section>

              {data.strategy && (
                <section className="rounded-lg border border-line bg-white p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Stratégie</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-ink">{data.strategy}</p>
                </section>
              )}

              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Description</h3>
                <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-ink">{data.description}</p>
              </section>

              {data.resolution && (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Résolution (clôturé {data.closedAt ? fmtDate(data.closedAt) : ""})
                  </h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-emerald-900">{data.resolution}</p>
                </section>
              )}
            </div>
          ) : tab === "timeline" ? (
            <LegalEventTimeline events={data.events} />
          ) : (
            <DocumentsList documents={documents} />
          )}
        </div>

        {!isClosed && !readOnly && data && (
          <footer className="grid shrink-0 grid-cols-3 gap-1.5 border-t border-line bg-surface-alt/40 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowEvent(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-violet-600 px-2 text-[12px] font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> Acte
            </button>
            <button
              type="button"
              onClick={() => setShowProvision(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Banknote className="h-3.5 w-3.5" /> Provision
            </button>
            <button
              type="button"
              onClick={() => setShowClose(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-line bg-white px-2 text-[12px] font-semibold text-ink hover:bg-surface-alt"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Clôturer
            </button>
          </footer>
        )}

        {data && showEvent && (
          <EventAddModal caseId={data.id} onClose={() => setShowEvent(false)} />
        )}
        {data && showProvision && (
          <ProvisionAdjustmentModal
            caseId={data.id}
            currentProvision={data.provisionAmount}
            amountAtStake={data.amountAtStake}
            onClose={() => setShowProvision(false)}
          />
        )}
        {data && showClose && (
          <CloseLegalCaseModal
            caseId={data.id}
            currentProvision={data.provisionAmount}
            onClose={() => setShowClose(false)}
          />
        )}
      </aside>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-ink-3">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-0.5 truncate text-[12px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className={clsx("rounded-md border p-2", tone === "amber" ? "border-amber-200 bg-amber-50" : "border-line bg-surface-alt/50")}>
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13px] font-bold text-ink">{value}</div>
    </div>
  );
}

function DocumentsList({ documents }: { documents: LegalCaseEventEntry[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[12px] text-ink-3">
        <FileText className="mx-auto h-8 w-8 text-ink-3/40" />
        <p className="mt-2">Aucune pièce jointe.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {documents.map((d) => (
        <li key={d.id} className="flex items-start gap-2 rounded-md border border-line bg-white px-3 py-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-ink">{d.eventType}</div>
            <div className="line-clamp-2 text-[11.5px] text-ink-3">{d.description}</div>
            <div className="font-mono text-[10.5px] text-ink-3/70">
              {new Date(d.eventDate).toLocaleDateString("fr-FR")}
            </div>
          </div>
          <a
            href={d.documentUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-violet-700 hover:underline"
          >
            Ouvrir
          </a>
        </li>
      ))}
    </ul>
  );
}
