"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, Check, X, AlertTriangle, FileText } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/format";
import { useTenantHref } from "@/hooks/useTenantHref";
import { useOwnerDecisions, useOwnerDecisionsHistory, useDecide, type OwnerDecision } from "@/hooks/useOwnerDecisions";

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: "Critique", cls: "bg-danger/10 text-danger" },
  URGENT: { label: "Urgent", cls: "bg-danger/10 text-danger" },
  HIGH: { label: "Important", cls: "bg-warning/10 text-warning" },
  NORMAL: { label: "Normal", cls: "bg-primary-50 text-primary-700" },
  LOW: { label: "Faible", cls: "bg-ink-3/10 text-ink-3" },
};

export default function OwnerDecisionsPage() {
  const { data, isLoading, isError } = useOwnerDecisions();
  const tenantHref = useTenantHref();

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-4">
        <Link href={tenantHref("/proprietaire")} className="mb-2 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Décisions à valider</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Les demandes importantes qui attendent votre accord. Approuvez ou refusez en un clic.
        </p>
      </header>

      {isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Impossible de charger les décisions.</div>
      ) : isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-alt" />)}</div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-12 text-center">
          <Check className="mx-auto h-8 w-8 text-success" />
          <p className="mt-2 text-[13px] font-medium text-ink">Rien à valider pour le moment.</p>
          <p className="text-[12px] text-ink-3">Toutes les demandes ont été traitées.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((d) => <DecisionCard key={d.id} d={d} />)}
        </ul>
      )}

      <HistorySection />
    </div>
  );
}

function HistorySection() {
  const { data, isLoading } = useOwnerDecisionsHistory();
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><FileText className="h-4 w-4 text-primary-600" /> Historique de mes décisions</h2>
        {data && (
          <span className="text-[11.5px] text-ink-3">
            <span className="text-success">{data.resume.approuves} approuvée(s)</span> · <span className="text-danger">{data.resume.rejetes} refusée(s)</span>
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded bg-surface-alt" />
      ) : !data || data.items.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-ink-3">Aucune décision rendue pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr><th className="px-2 py-1">Demande</th><th className="px-2 py-1 text-right">Montant</th><th className="px-2 py-1">Décision</th><th className="px-2 py-1">Date</th></tr>
            </thead>
            <tbody>
              {data.items.map((h) => (
                <tr key={h.id} className="border-t border-line/60">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[11px] text-ink-3">{h.reference}</span> {h.title}
                    {h.decision === "REJECTED" && h.motif ? <span className="block text-[11px] text-danger">Motif : {h.motif}</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.amount ? formatFCFA(BigInt(h.amount), { scale: "raw" }) : "—"}</td>
                  <td className="px-2 py-1.5">
                    <span className={clsx("rounded px-2 py-0.5 text-[11px] font-medium", h.decision === "APPROVED" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                      {h.decision === "APPROVED" ? "Approuvée" : "Refusée"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-ink-3">{formatDate(h.decidedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DecisionCard({ d }: { d: OwnerDecision }) {
  const decide = useDecide();
  const [mode, setMode] = useState<null | "REJECT">(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const prio = PRIORITY_LABEL[d.priority] ?? PRIORITY_LABEL.NORMAL;

  const act = async (decision: "APPROVE" | "REJECT") => {
    setError(null);
    if (decision === "REJECT" && !reason.trim()) { setError("Indiquez un motif de refus"); return; }
    try {
      await decide.mutateAsync({ id: d.id, decision, reason: reason.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <li className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx("rounded px-2 py-0.5 text-[11px] font-medium", prio.cls)}>{prio.label}</span>
            <span className="font-mono text-[11px] text-ink-3">{d.reference}</span>
          </div>
          <h3 className="mt-1 text-[14px] font-semibold text-ink">{d.title}</h3>
          {d.description && <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-3">{d.description}</p>}
          <p className="mt-1 text-[11.5px] text-ink-3">
            {d.demandeur ? <>Transmis par le DG ({d.demandeur}) · </> : null}
            Demande initiale : {d.initiator} · {formatDate(d.createdAt)}
          </p>
        </div>
        {d.amount && (
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Montant</div>
            <div className="text-lg font-bold tabular-nums text-ink">{formatFCFA(BigInt(d.amount), { scale: "raw" })}</div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>}

      {mode === "REJECT" ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Motif du refus (obligatoire)…"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-[13px]"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setMode(null); setReason(""); }} className="rounded-md px-3 py-2 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
            <button type="button" onClick={() => act("REJECT")} disabled={decide.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Confirmer le refus
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
            {d.priority === "CRITICAL" || d.priority === "URGENT" ? <AlertTriangle className="h-3.5 w-3.5 text-danger" /> : <FileText className="h-3.5 w-3.5" />}
            {d.type}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("REJECT")} disabled={decide.isPending} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[12.5px] font-medium text-ink-2 hover:border-danger/40 hover:text-danger disabled:opacity-50">
              <X className="h-3.5 w-3.5" /> Refuser
            </button>
            <button type="button" onClick={() => act("APPROVE")} disabled={decide.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> {decide.isPending ? "…" : "Approuver"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
