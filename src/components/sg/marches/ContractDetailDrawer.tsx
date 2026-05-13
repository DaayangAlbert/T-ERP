"use client";

import { useState } from "react";
import {
  X,
  FileText,
  GitBranch,
  FilePlus,
  Banknote,
  ChevronRight,
  Check,
  Plus,
  AlertOctagon,
  Building2,
  CalendarClock,
  Unlock,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useContractDetail,
  useTransitionPhase,
  useCreateAmendment,
  useCreateGuarantee,
  useReleaseGuarantee,
  type ContractDetail,
} from "@/hooks/useSgContracts";
import { ContractsLifecycleVisual, getPhaseLabel, ALL_PHASES } from "./ContractsLifecycleVisual";
import type { ContractPhase, GuaranteeType } from "@prisma/client";

const STATUS_CHIP: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

const LEGAL_STATUS_CHIP: Record<string, string> = {
  OK: "bg-emerald-100 text-emerald-700",
  LITIGATION: "bg-rose-100 text-rose-700",
  AMENDMENT_PENDING: "bg-amber-100 text-amber-700",
  EXPIRED_GUARANTEE: "bg-rose-100 text-rose-700",
};

const AMENDMENT_STATUS_CHIP: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  SIGNED: "bg-violet-100 text-violet-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

const GUARANTEE_TYPE_LABEL: Record<GuaranteeType, string> = {
  SUBMISSION: "Soumission",
  PERFORMANCE: "Bonne exécution",
  RETENTION: "Retenue de garantie",
  ADVANCE_PAYMENT: "Avance",
};

const GUARANTEE_STATUS_CHIP: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  EXPIRED: "bg-rose-100 text-rose-700",
  RELEASED: "bg-slate-100 text-slate-700",
  REVOKED: "bg-rose-100 text-rose-700",
};

type Tab = "identity" | "phases" | "amendments" | "guarantees";

function fmtAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
  return v.toLocaleString("fr-FR");
}
function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  contractId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

export function ContractDetailDrawer({ contractId, readOnly, onClose }: Props) {
  const { data, isLoading, isError } = useContractDetail(contractId);
  const [tab, setTab] = useState<Tab>("identity");

  if (!contractId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[600px]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-bold text-ink">
                {data?.reference ?? "Marché"}
              </h2>
              {data && (
                <>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_CHIP[data.status])}>
                    {data.status}
                  </span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", LEGAL_STATUS_CHIP[data.legalStatus])}>
                    {data.legalStatus}
                  </span>
                </>
              )}
            </div>
            {data && (
              <div className="mt-0.5 line-clamp-1 text-[12px] text-ink-3">{data.title}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Onglets */}
        <nav className="flex border-b border-line bg-surface-alt/30">
          {[
            { id: "identity" as Tab, label: "Identité", icon: FileText },
            { id: "phases" as Tab, label: "Phases", icon: GitBranch },
            { id: "amendments" as Tab, label: `Avenants${data ? ` (${data.amendments.length})` : ""}`, icon: FilePlus },
            { id: "guarantees" as Tab, label: `Garanties${data ? ` (${data.bankGuarantees.length})` : ""}`, icon: Banknote },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-[11.5px] font-semibold transition",
                  tab === t.id ? "border-violet-600 bg-white text-violet-700" : "border-transparent text-ink-3 hover:bg-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              Impossible de charger le marché.
            </div>
          ) : tab === "identity" ? (
            <IdentityTab data={data} />
          ) : tab === "phases" ? (
            <PhasesTab data={data} readOnly={readOnly} />
          ) : tab === "amendments" ? (
            <AmendmentsTab data={data} readOnly={readOnly} />
          ) : (
            <GuaranteesTab data={data} readOnly={readOnly} />
          )}
        </div>
      </aside>
    </div>
  );
}

function IdentityTab({ data }: { data: ContractDetail }) {
  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-2">
        <Stat label="Montant HT" value={`${fmtAmount(data.amountHT)} ${data.currency}`} />
        <Stat label="Phase" value={getPhaseLabel(data.phase)} />
        <Stat label="TVA" value={`${data.vatRate.toFixed(2)} %`} />
        <Stat label="Site lié" value={data.site?.name ?? "—"} />
      </section>

      <section className="rounded-lg border border-line p-3">
        <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Maître d'ouvrage</h3>
        <div className="text-[13px] font-semibold text-ink">{data.contractingAuthority}</div>
        <div className="text-[11.5px] text-ink-3">{data.authorityType}</div>
      </section>

      {data.site && (
        <section className="rounded-lg border border-line p-3">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <Building2 className="h-3.5 w-3.5 text-violet-600" /> Chantier rattaché
          </h3>
          <div className="text-[13px] font-semibold text-ink">{data.site.name}</div>
          <div className="text-[11.5px] text-ink-3">
            {data.site.code} · {data.site.status}
            {data.site.manager && ` · ${data.site.manager}`}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-line p-3">
        <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Jalons</h3>
        <dl className="space-y-1 text-[11.5px]">
          {[
            ["AO ouvert", data.callForTendersOpenDate],
            ["AO clos", data.callForTendersCloseDate],
            ["Soumission", data.submissionDate],
            ["Notification", data.notificationDate],
            ["Signature", data.signatureDate],
            ["OS", data.orderServiceDate],
            ["Démarrage exécution", data.executionStartDate],
            ["PV réception", data.receptionPV],
            ["Fin GPA", data.gpaEndDate],
          ].map(([label, date]) => (
            <div key={label as string} className="flex justify-between gap-3">
              <dt className="text-ink-3">{label}</dt>
              <dd className={clsx("font-mono", date ? "text-ink" : "text-ink-3/60")}>{fmtDate(date as string | null)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {data.legalCases.length > 0 && (
        <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-800">
            <AlertOctagon className="h-3.5 w-3.5" /> Contentieux liés ({data.legalCases.length})
          </h3>
          <ul className="space-y-1 text-[11.5px]">
            {data.legalCases.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-2">
                <span className="text-ink">
                  <span className="font-mono">{l.reference}</span> · {l.title}
                </span>
                <span className="font-mono font-semibold text-rose-700">{fmtAmount(l.amountAtStake)} FCFA</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PhasesTab({ data, readOnly }: { data: ContractDetail; readOnly: boolean }) {
  const transition = useTransitionPhase(data.id);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [targetPhase, setTargetPhase] = useState<ContractPhase | "">("");

  const currentIdx = ALL_PHASES.findIndex((p) => p.code === data.phase);
  const nextPhase = ALL_PHASES[currentIdx + 1]?.code;

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-line p-3">
        <h3 className="mb-2 text-[12.5px] font-semibold text-ink">Pipeline 8 phases</h3>
        <ContractsLifecycleVisual currentPhase={data.phase} />
        <div className="mt-3 rounded-md bg-surface-alt/50 px-3 py-2 text-[11.5px] text-ink-3">
          Phase actuelle : <strong className="text-violet-700">{getPhaseLabel(data.phase)}</strong>
          {nextPhase && (
            <>
              {" "}
              · Prochaine étape : <strong className="text-ink">{getPhaseLabel(nextPhase)}</strong>
            </>
          )}
        </div>
      </section>

      {!readOnly && nextPhase && data.phase !== "CLOSED" && (
        <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
          <h3 className="mb-1.5 text-[12.5px] font-semibold text-violet-800">Faire avancer le cycle</h3>
          <select
            value={targetPhase}
            onChange={(e) => setTargetPhase(e.target.value as ContractPhase)}
            className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          >
            <option value="">Choisir la phase cible…</option>
            <option value={nextPhase}>{getPhaseLabel(nextPhase)} (suivante)</option>
            {data.phase === "AWAITING_ATTRIBUTION" && (
              <option value="CLOSED">Clôturer (AO non-attribué)</option>
            )}
          </select>
          {feedback && (
            <div
              className={clsx(
                "mt-2 rounded-md border px-2 py-1.5 text-[11.5px]",
                feedback.kind === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              {feedback.msg}
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={!targetPhase || transition.isPending}
              onClick={() => {
                if (!targetPhase) return;
                setFeedback(null);
                transition.mutate(
                  { targetPhase: targetPhase as ContractPhase },
                  {
                    onSuccess: (r) => {
                      setFeedback({ kind: "ok", msg: `Phase mise à jour : ${getPhaseLabel(r.phase)}` });
                      setTargetPhase("");
                    },
                    onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                  },
                );
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {transition.isPending ? "Transition…" : "Avancer la phase"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function AmendmentsTab({ data, readOnly }: { data: ContractDetail; readOnly: boolean }) {
  const create = useCreateAmendment(data.id);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [delay, setDelay] = useState<number | "">("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  return (
    <div className="space-y-3">
      {data.amendments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-[12px] text-ink-3">
          Aucun avenant pour ce marché.
        </div>
      ) : (
        <ul className="rounded-lg border border-line">
          {data.amendments.map((a, idx) => (
            <li key={a.id} className={clsx("flex items-start gap-3 px-3 py-2.5", idx < data.amendments.length - 1 && "border-b border-line")}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-violet-100 text-[12px] font-bold text-violet-700">
                #{a.amendmentNumber}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">
                    {a.additionalAmount >= 0 ? "+" : ""}
                    {fmtAmount(a.additionalAmount)} FCFA
                    {a.additionalDelayDays ? ` · +${a.additionalDelayDays} jours` : ""}
                  </span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", AMENDMENT_STATUS_CHIP[a.status])}>
                    {a.status}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] text-ink-3">{a.reason}</p>
                {a.signedAt && (
                  <div className="mt-1 text-[10.5px] text-ink-3">Signé le {fmtDate(a.signedAt)}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-violet-50 px-3 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-100"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvel avenant
        </button>
      )}

      {!readOnly && showForm && (
        <section className="rounded-lg border border-violet-200 p-3">
          <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Nouvel avenant #{data.amendments.length + 1}</h3>
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Motif *</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Ex. extension ouvrage, modification spécifications…"
                className="mt-0.5 w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Montant + FCFA *</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12.5px] outline-none focus:border-violet-400"
                />
              </label>
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Délai +jours</span>
                <input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12.5px] outline-none focus:border-violet-400"
                />
              </label>
            </div>
            {feedback && (
              <div
                className={clsx(
                  "rounded-md border px-2 py-1.5 text-[11.5px]",
                  feedback.kind === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800",
                )}
              >
                {feedback.msg}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setReason("");
                  setAmount("");
                  setDelay("");
                  setFeedback(null);
                }}
                className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={create.isPending || reason.trim().length < 3 || typeof amount !== "number"}
                onClick={() => {
                  if (typeof amount !== "number") return;
                  setFeedback(null);
                  create.mutate(
                    {
                      reason: reason.trim(),
                      additionalAmount: amount,
                      additionalDelayDays: typeof delay === "number" ? delay : undefined,
                    },
                    {
                      onSuccess: (r) => {
                        setFeedback({ kind: "ok", msg: `Avenant #${r.amendmentNumber} créé (DRAFT)` });
                        setReason("");
                        setAmount("");
                        setDelay("");
                        setShowForm(false);
                      },
                      onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                    },
                  );
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {create.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function GuaranteesTab({ data, readOnly }: { data: ContractDetail; readOnly: boolean }) {
  const create = useCreateGuarantee(data.id);
  const release = useReleaseGuarantee(data.id);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<GuaranteeType>("PERFORMANCE");
  const [amount, setAmount] = useState<number | "">("");
  const [bank, setBank] = useState("");
  const [issued, setIssued] = useState("");
  const [expiry, setExpiry] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  return (
    <div className="space-y-3">
      {data.bankGuarantees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-[12px] text-ink-3">
          Aucune garantie bancaire pour ce marché.
        </div>
      ) : (
        <ul className="rounded-lg border border-line">
          {data.bankGuarantees.map((g, idx) => (
            <li key={g.id} className={clsx("flex items-start gap-3 px-3 py-2.5", idx < data.bankGuarantees.length - 1 && "border-b border-line")}>
              <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink">
                    {GUARANTEE_TYPE_LABEL[g.type]} · <span className="font-mono">{fmtAmount(g.amount)} FCFA</span>
                  </span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", GUARANTEE_STATUS_CHIP[g.status])}>
                    {g.status}
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">{g.issuingBank}</div>
                <div className="text-[10.5px] text-ink-3">
                  <CalendarClock className="mr-1 inline h-3 w-3" />
                  Émise {fmtDate(g.issuedAt)} · expire {fmtDate(g.expiryDate)}
                  {g.releaseDate && ` · levée ${fmtDate(g.releaseDate)}`}
                </div>
                {!readOnly && g.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={release.isPending}
                    onClick={() => {
                      setFeedback(null);
                      release.mutate(
                        { guaranteeId: g.id },
                        {
                          onSuccess: () => setFeedback({ kind: "ok", msg: "Garantie levée." }),
                          onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                        },
                      );
                    }}
                    className="mt-1 inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <Unlock className="h-3 w-3" /> Lever la garantie
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-violet-50 px-3 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-100"
        >
          <Plus className="h-3.5 w-3.5" /> Émettre une garantie
        </button>
      )}

      {feedback && (
        <div
          className={clsx(
            "rounded-md border px-3 py-2 text-[11.5px]",
            feedback.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          {feedback.msg}
        </div>
      )}

      {!readOnly && showForm && (
        <section className="rounded-lg border border-violet-200 p-3">
          <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Nouvelle garantie bancaire</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Type *</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as GuaranteeType)}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
                >
                  {(Object.keys(GUARANTEE_TYPE_LABEL) as GuaranteeType[]).map((t) => (
                    <option key={t} value={t}>{GUARANTEE_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Montant FCFA *</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-[12.5px] outline-none focus:border-violet-400"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Banque émettrice *</span>
              <input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Ex. SGBC, BICEC, Afriland First Bank…"
                className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Émission *</span>
                <input
                  type="date"
                  value={issued}
                  onChange={(e) => setIssued(e.target.value)}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
                />
              </label>
              <label className="block">
                <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Expiration *</span>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setAmount("");
                  setBank("");
                  setIssued("");
                  setExpiry("");
                }}
                className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={create.isPending || !bank.trim() || typeof amount !== "number" || !issued || !expiry}
                onClick={() => {
                  if (typeof amount !== "number") return;
                  setFeedback(null);
                  create.mutate(
                    {
                      type,
                      amount,
                      issuingBank: bank.trim(),
                      issuedAt: new Date(issued).toISOString(),
                      expiryDate: new Date(expiry).toISOString(),
                    },
                    {
                      onSuccess: () => {
                        setFeedback({ kind: "ok", msg: "Garantie émise." });
                        setShowForm(false);
                        setAmount("");
                        setBank("");
                        setIssued("");
                        setExpiry("");
                      },
                      onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                    },
                  );
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {create.isPending ? "Création…" : "Émettre"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink">{value}</div>
    </div>
  );
}
