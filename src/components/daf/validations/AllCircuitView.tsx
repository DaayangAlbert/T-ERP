"use client";

import { useState } from "react";
import { ArrowRight, Bell, Hand, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useAllCircuit, useUnblock, type CircuitItem } from "@/hooks/useDafValidationsCircuit";

const TYPE_LABEL: Record<string, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
  AMENDMENT: "Avenant marché",
  SUBCONTRACTING: "Sous-traitance",
  EQUIPMENT: "Acquisition matériel",
  SPECIAL_METHOD: "Méthode spéciale",
  TECHNICAL_HANDOVER: "Mise en service",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-ink-3/10 text-ink-3",
  NORMAL: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning",
  URGENT: "bg-danger/10 text-danger",
};

function fmt(amount: string | null): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function blockedClasses(days: number | null): string {
  if (days === null) return "text-ink-3";
  if (days >= 7) return "text-rose-700 font-semibold";
  if (days >= 3) return "text-amber-700 font-semibold";
  return "text-ink-3";
}

function WorkflowDots({ currentStep }: { currentStep: string | null }) {
  const steps = ["RH", "DAF", "DG"];
  const idx = currentStep ? steps.indexOf(currentStep) : -1;
  return (
    <div className="inline-flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span
            className={clsx(
              "grid h-5 w-5 place-items-center rounded-full border text-[9px] font-bold",
              i < idx
                ? "border-emerald-500 bg-emerald-500 text-white"
                : i === idx
                  ? "border-primary-500 bg-primary-500 text-white"
                  : "border-line bg-white text-ink-3"
            )}
          >
            {s[0]}
          </span>
          {i < steps.length - 1 && <span className="h-px w-2 bg-line" />}
        </div>
      ))}
    </div>
  );
}

function UnblockDialog({
  item,
  action,
  onClose,
}: {
  item: CircuitItem;
  action: "RELANCE" | "TAKE_OVER";
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const mut = useUnblock();
  const title = action === "RELANCE" ? "Relancer le validateur" : "Reprendre la main (DAF)";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="mb-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-[12px] text-ink-3">
            {item.reference} · {item.title} · validateur actuel : {item.currentApprover}
          </p>
        </header>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={action === "RELANCE" ? "Message de relance (optionnel)" : "Motif de la reprise"}
          className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] focus:border-primary-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt">
            Annuler
          </button>
          <button
            type="button"
            disabled={mut.isPending}
            onClick={() => mut.mutate({ id: item.id, action, note: note.trim() || undefined }, { onSuccess: onClose })}
            className={clsx(
              "h-8 rounded-md px-3 text-[12.5px] font-semibold text-white disabled:opacity-50",
              action === "RELANCE" ? "bg-primary-500 hover:bg-primary-600" : "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {mut.isPending ? "..." : title}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AllCircuitView() {
  const [step, setStep] = useState<string>("");
  const [type, setType] = useState<string>("");
  const { data, isLoading } = useAllCircuit({ step: step || undefined, type: type || undefined });
  const [target, setTarget] = useState<{ item: CircuitItem; action: "RELANCE" | "TAKE_OVER" } | null>(null);

  return (
    <div className="space-y-3">
      {/* Bandeau DAF */}
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 text-primary-900">
        <p className="text-[13px]">
          <span className="font-semibold">Vue transverse des validations</span>
          {" · "}
          <span className="font-mono font-bold">{data?.summary.total ?? "—"}</span> demandes en circuit
          {" · "}
          <span className="font-mono font-bold">{fmt(data?.summary.totalAmount ?? null)}</span> FCFA total
        </p>
      </div>

      {/* KPIs par étape */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["RH", "DAF", "DG"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(step === s ? "" : s)}
            className={clsx(
              "rounded-md border p-2.5 text-center transition",
              step === s ? "border-primary-500 bg-primary-50" : "border-line bg-white hover:bg-surface-alt"
            )}
          >
            <div className="text-[10.5px] uppercase text-ink-3">Étape {s}</div>
            <div className="font-mono text-[16px] font-bold text-ink">{data?.summary.byStep[s] ?? 0}</div>
          </button>
        ))}
        <div className={clsx("rounded-md border p-2.5 text-center", (data?.summary.blockedCount ?? 0) > 0 ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
          <div className={clsx("text-[10.5px] uppercase", (data?.summary.blockedCount ?? 0) > 0 ? "text-rose-700" : "text-ink-3")}>Bloquées (≥3 j)</div>
          <div className={clsx("font-mono text-[16px] font-bold", (data?.summary.blockedCount ?? 0) > 0 ? "text-rose-700" : "text-ink")}>
            {data?.summary.blockedCount ?? 0}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-8 rounded-md border border-line bg-white px-2 text-[12px]"
        >
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {step && (
          <button
            type="button"
            onClick={() => setStep("")}
            className="h-8 rounded-md border border-line bg-white px-2 text-[12px] text-ink-3 hover:bg-surface-alt"
          >
            ✕ Étape {step}
          </button>
        )}
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-3">
          Aucune validation dans le circuit avec ces filtres.
        </div>
      ) : (
        <>
          {/* Desktop : tableau */}
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-3 py-2 text-left">Réf</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Initiateur</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                  <th className="px-3 py-2 text-left">Étape actuelle</th>
                  <th className="px-3 py-2 text-left">Validateur</th>
                  <th className="px-3 py-2 text-right">Bloqué depuis</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((it) => (
                  <tr key={it.id} className={clsx("hover:bg-surface-alt/40", (it.blockedDays ?? 0) >= 7 && "bg-rose-50/40")}>
                    <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{it.reference}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                        {TYPE_LABEL[it.type] ?? it.type}
                      </span>
                      <span className={clsx("ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY_BADGE[it.priority])}>
                        {it.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink">{it.initiator}</td>
                    <td className="px-3 py-2 text-right font-mono text-[12.5px]">{fmt(it.amount)}</td>
                    <td className="px-3 py-2">
                      <WorkflowDots currentStep={it.currentStep} />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-ink-3">{it.currentApprover}</td>
                    <td className={clsx("px-3 py-2 text-right text-[12px]", blockedClasses(it.blockedDays))}>
                      {it.blockedDays ? `${it.blockedDays} j` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setTarget({ item: it, action: "RELANCE" })}
                          className="grid h-7 w-7 place-items-center rounded text-primary-600 hover:bg-primary-50"
                          title="Relancer"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTarget({ item: it, action: "TAKE_OVER" })}
                          className="grid h-7 w-7 place-items-center rounded text-amber-600 hover:bg-amber-50"
                          title="Reprendre la main"
                        >
                          <Hand className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : cards avec workflow vertical */}
          <div className="space-y-2 md:hidden">
            {data.items.map((it) => (
              <div key={it.id} className={clsx("rounded-xl border bg-white p-3", (it.blockedDays ?? 0) >= 3 ? "border-rose-200 bg-rose-50/40" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] text-ink-3">{it.reference}</div>
                    <div className="text-[13px] font-semibold text-ink">{it.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-3">{it.initiator}</div>
                  </div>
                  <div className="text-right">
                    {it.amount && <div className="font-mono text-[12.5px] font-bold text-ink">{fmt(it.amount)}</div>}
                    {it.blockedDays && it.blockedDays >= 3 && (
                      <span className={clsx("inline-flex items-center gap-1 text-[10.5px]", blockedClasses(it.blockedDays))}>
                        <AlertTriangle className="h-3 w-3" /> {it.blockedDays} j
                      </span>
                    )}
                  </div>
                </div>
                <div className="my-2 border-t border-line"></div>
                <div className="flex items-center justify-between text-[11.5px]">
                  <WorkflowDots currentStep={it.currentStep} />
                  <span className="text-ink-3">→ {it.currentApprover}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setTarget({ item: it, action: "RELANCE" })}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-primary-200 bg-white px-2 py-1.5 text-[11.5px] font-semibold text-primary-700"
                  >
                    <Bell className="h-3 w-3" /> Relancer
                  </button>
                  <button
                    type="button"
                    onClick={() => setTarget({ item: it, action: "TAKE_OVER" })}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1.5 text-[11.5px] font-semibold text-amber-700"
                  >
                    <Hand className="h-3 w-3" /> Reprendre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {target && <UnblockDialog item={target.item} action={target.action} onClose={() => setTarget(null)} />}
    </div>
  );
}
