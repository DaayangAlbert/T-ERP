"use client";

import { useState } from "react";
import { ClipboardCheck, GitBranch, Users, Check, X, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import {
  useApproveRhValidation,
  useRejectRhValidation,
  useRhCircuit,
  useRhDelegations,
  useRhPendingValidations,
  type RhCircuitItem,
  type RhPendingValidation,
} from "@/hooks/useRhValidations";
import { useAuth } from "@/hooks/useAuth";

type Tab = "n1" | "circuit" | "delegations";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "n1", label: "Mes N1 RH", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  { key: "circuit", label: "Tout le circuit RH", icon: <GitBranch className="h-3.5 w-3.5" /> },
  { key: "delegations", label: "Délégations RH", icon: <Users className="h-3.5 w-3.5" /> },
];

function fmt(amount: string | null): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function priorityClass(p: string): string {
  if (p === "URGENT") return "bg-rose-100 text-rose-800";
  if (p === "HIGH") return "bg-amber-100 text-amber-800";
  if (p === "NORMAL") return "bg-blue-100 text-blue-800";
  return "bg-surface-alt text-ink-3";
}

const TYPE_LABEL: Record<string, string> = {
  PAYROLL: "Paie",
  HIRING: "Embauche",
  CONTRACT: "Avenant contrat",
  LEAVE: "Congé > 30j",
};

export default function RhValidationsPage() {
  const [tab, setTab] = useState<Tab>("n1");
  const { data: pending } = useRhPendingValidations();

  const totalAmount = pending?.summary.totalAmount ?? "0";
  const fmtTotal = Number(totalAmount) > 0 ? `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(totalAmount)))} FCFA` : "—";

  return (
    <div className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Validations RH</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">Mes N1 RH, vue transverse du circuit, délégations en cas d&apos;absence.</p>
      </header>

      <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 text-primary-900">
        <p className="text-[13px]">
          <span className="font-semibold">Validations RH N1</span> ·{" "}
          <span className="font-mono font-bold">{pending?.summary.total ?? 0}</span> demande{(pending?.summary.total ?? 0) > 1 ? "s" : ""} en attente
          {" · "}cumul impact équivalent annuel{" "}
          <span className="font-mono font-bold">{fmtTotal}</span>
        </p>
      </div>

      <div className="-mx-3 overflow-x-auto px-3">
        <div className="inline-flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
                tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
              )}
            >
              {t.icon}
              {t.label}
              {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      {tab === "n1" && <N1View />}
      {tab === "circuit" && <CircuitView />}
      {tab === "delegations" && <DelegationsView />}
    </div>
  );
}

function N1View() {
  const { data, isLoading } = useRhPendingValidations();
  const approve = useApproveRhValidation();
  const reject = useRejectRhValidation();
  const { user } = useAuth();
  const [rejectTarget, setRejectTarget] = useState<RhPendingValidation | null>(null);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }
  if (data.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
        Aucune validation N1 RH en attente.{user ? ` Bravo ${user.firstName} 👏` : ""}
      </div>
    );
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Réf</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Demande</th>
              <th className="px-3 py-2 text-left">Initiateur</th>
              <th className="px-3 py-2 text-right">Impact</th>
              <th className="px-3 py-2 text-left">Priorité</th>
              <th className="px-3 py-2 text-right">Ancienneté</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((v) => (
              <tr key={v.id} className="hover:bg-surface-alt/40">
                <td className="px-3 py-2 font-mono text-[11px] text-ink-3">{v.reference}</td>
                <td className="px-3 py-2 text-[12px] text-ink">{TYPE_LABEL[v.type] ?? v.type}</td>
                <td className="px-3 py-2">
                  <div className="font-medium text-ink truncate max-w-[280px]">{v.title}</div>
                </td>
                <td className="px-3 py-2 text-[11.5px] text-ink-3">{v.initiator}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px]">{fmt(v.amount)}</td>
                <td className="px-3 py-2">
                  <span className={clsx("rounded px-1.5 py-0.5 text-[10.5px] font-semibold", priorityClass(v.priority))}>
                    {v.priority}
                  </span>
                </td>
                <td className={clsx("px-3 py-2 text-right font-mono text-[12px]", v.ageDays >= 3 ? "text-rose-700 font-bold" : "text-ink-3")}>
                  {v.ageDays} j
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(v.id)} className="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40" title="Valider">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => setRejectTarget(v)} className="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50" title="Rejeter">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {data.items.map((v) => (
          <li key={v.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3">{v.reference}</div>
                <div className="text-[13px] font-semibold text-ink">{v.title}</div>
                <div className="text-[11.5px] text-ink-3">{TYPE_LABEL[v.type] ?? v.type} · {v.initiator}</div>
              </div>
              <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0", priorityClass(v.priority))}>
                {v.priority}
              </span>
            </div>
            <div className="my-2 border-t border-line" />
            <div className="flex items-center justify-between text-[11.5px]">
              {v.amount && <span className="font-mono text-ink">{fmt(v.amount)} FCFA</span>}
              <span className={clsx(v.ageDays >= 3 ? "text-rose-700 font-bold" : "text-ink-3")}>
                {v.ageDays >= 3 && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                {v.ageDays} j
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(v.id)} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 text-[12.5px] font-semibold text-white disabled:opacity-40">
                <Check className="h-3.5 w-3.5" /> Valider
              </button>
              <button type="button" onClick={() => setRejectTarget(v)} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-rose-600 px-2 text-[12.5px] font-semibold text-white">
                <X className="h-3.5 w-3.5" /> Rejeter
              </button>
            </div>
          </li>
        ))}
      </ul>

      {rejectTarget && (
        <RejectDialog item={rejectTarget} onConfirm={(reason) => reject.mutate({ id: rejectTarget.id, reason }, { onSuccess: () => setRejectTarget(null) })} onClose={() => setRejectTarget(null)} isPending={reject.isPending} />
      )}
    </>
  );
}

function RejectDialog({ item, onConfirm, onClose, isPending }: { item: RhPendingValidation; onConfirm: (r: string) => void; onClose: () => void; isPending: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink">Rejeter la validation</h3>
        <p className="text-[12px] text-ink-3">{item.title}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Motif (obligatoire)" className="mt-2 w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px]" />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">Annuler</button>
          <button type="button" disabled={!reason.trim() || isPending} onClick={() => onConfirm(reason.trim())} className="h-8 rounded-md bg-rose-600 px-3 text-[12.5px] font-semibold text-white disabled:opacity-50">
            {isPending ? "..." : "Rejeter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CircuitView() {
  const { data, isLoading } = useRhCircuit();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  if (data.items.length === 0) {
    return <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">Aucune validation RH dans le circuit.</div>;
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["RH", "DAF", "DG"] as const).map((s) => (
          <div key={s} className="rounded-md border border-line bg-white p-2.5 text-center">
            <div className="text-[10.5px] uppercase text-ink-3">Étape {s}</div>
            <div className="font-mono text-[16px] font-bold text-ink">{data.summary.byStep[s]}</div>
          </div>
        ))}
        <div className={clsx("rounded-md border p-2.5 text-center", data.summary.blockedCount > 0 ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
          <div className={clsx("text-[10.5px] uppercase", data.summary.blockedCount > 0 ? "text-rose-700" : "text-ink-3")}>Bloquées</div>
          <div className={clsx("font-mono text-[16px] font-bold", data.summary.blockedCount > 0 ? "text-rose-700" : "text-ink")}>{data.summary.blockedCount}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.items.map((it: RhCircuitItem) => (
          <div key={it.id} className="rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10.5px] text-ink-3">{it.reference}</div>
                <div className="text-[13px] font-semibold text-ink">{it.title}</div>
                <div className="text-[11.5px] text-ink-3">{TYPE_LABEL[it.type] ?? it.type} · {it.initiator}</div>
              </div>
              <div className="text-right text-[11.5px]">
                <div className="text-ink-3">Étape</div>
                <div className="font-semibold text-primary-700">{it.currentStep}</div>
                <div className="mt-1 text-[10.5px] text-ink-3">→ {it.currentApprover}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11.5px]">
              {it.amount && <span className="font-mono text-ink">{fmt(it.amount)} FCFA</span>}
              {it.blockedDays !== null && (
                <span className={clsx("inline-flex items-center gap-1", it.blockedDays >= 7 ? "text-rose-700 font-bold" : "text-amber-700 font-semibold")}>
                  <AlertTriangle className="h-3 w-3" /> Bloqué {it.blockedDays} j
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DelegationsView() {
  const { data, isLoading } = useRhDelegations();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  return (
    <div className="space-y-3">
      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Mes délégations actives (sortantes)</h3>
        {data.outgoing.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12px] text-ink-3">Aucune délégation active.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.outgoing.map((d) => (
              <div key={d.id} className="rounded-xl border border-line bg-white p-3">
                <div className="text-[13px] font-semibold text-ink">{d.to}</div>
                <div className="text-[11px] text-ink-3">{d.toPosition}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.types.map((t) => (
                    <span key={t} className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-medium text-primary-700">{TYPE_LABEL[t] ?? t}</span>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-ink-3">
                  Période : {d.startDate?.slice(0, 10)} → {d.endDate?.slice(0, 10) ?? "—"}
                </div>
                {d.reason && <div className="mt-1 text-[11px] italic text-ink-3">« {d.reason} »</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Reçues</h3>
        {data.incoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white p-4 text-center text-[12px] text-ink-3">Aucune délégation reçue.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.incoming.map((d) => (
              <div key={d.id} className="rounded-xl border border-line bg-white p-3">
                <div className="text-[13px] font-semibold text-ink">De {d.from}</div>
                <div className="text-[11px] text-ink-3">{d.fromPosition}</div>
                <div className="mt-1 text-[11px] text-ink-3">
                  Types : {d.types.map((t) => TYPE_LABEL[t] ?? t).join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
