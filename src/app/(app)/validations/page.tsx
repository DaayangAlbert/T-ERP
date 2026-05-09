"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ChevronDown, ChevronRight, Clock, Users } from "lucide-react";
import { ValidationType, ValidationPriority } from "@prisma/client";
import { useValidations } from "@/hooks/useValidations";
import { WorkflowDiagram } from "@/components/validations/WorkflowDiagram";
import { BulkApproveBar } from "@/components/validations/BulkApproveBar";
import { DelegationsTab } from "@/components/validations/DelegationsTab";
import { ValidationHistoryTab } from "@/components/validations/ValidationHistoryTab";
import { formatFCFA, formatDate } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<ValidationType, string> = {
  PAYROLL: "Paie",
  EXPENSE: "Dépense",
  PURCHASE: "Achat",
  HIRING: "Embauche",
  CONTRACT: "Marché",
  LEAVE: "Congé",
  OTHER: "Autre",
};

const PRIORITY_BADGE: Record<ValidationPriority, string> = {
  LOW: "bg-ink-3/10 text-ink-3",
  NORMAL: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning",
  URGENT: "bg-danger/10 text-danger",
};

type Tab = "pending" | "history" | "delegations";

export default function ValidationsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const { data, isLoading } = useValidations({ type: typeFilter, priority: priorityFilter });

  const totalAmount = useMemo(() => {
    if (!data) return 0n;
    return Array.from(selected).reduce((sum, id) => {
      const v = data.items.find((x) => x.id === id);
      return v?.amount ? sum + BigInt(v.amount) : sum;
    }, 0n);
  }, [selected, data]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!data) return;
    setSelected(new Set(data.items.map((v) => v.id)));
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Mes validations</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Workflow d'approbation, validation en lot et délégations.
          </p>
        </div>
      </header>

      {/* Onglets */}
      <div className="mb-4 flex gap-1 border-b border-line">
        {([
          { key: "pending" as Tab, label: "En attente", count: data?.total },
          { key: "history" as Tab, label: "Historique" },
          { key: "delegations" as Tab, label: "Délégations" },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative px-4 py-2 text-[13px] font-medium transition",
              tab === t.key
                ? "text-primary-700"
                : "text-ink-3 hover:text-ink"
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <>
          {/* KPIs */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Clock className="h-4 w-4 text-warning" />}
              label="En attente"
              value={String(data?.total ?? "—")}
              hint="Toutes priorités"
            />
            <Kpi
              icon={<AlertTriangle className="h-4 w-4 text-danger" />}
              label="Urgentes"
              value={String(data?.items.filter((v) => v.priority === "URGENT").length ?? 0)}
              hint="< 48h"
            />
            <Kpi
              icon={<Users className="h-4 w-4 text-primary-500" />}
              label="Sélectionnées"
              value={String(selected.size)}
              hint={selected.size > 0 ? `Total ${formatFCFA(totalAmount)}` : "Cliquer pour cocher"}
            />
            <Kpi
              icon={<ArrowRight className="h-4 w-4 text-info" />}
              label="Délégations actives"
              value="2"
              hint="Voir l'onglet"
            />
          </div>

          {/* Filtres */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
            >
              <option value="">Tous types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
            >
              <option value="">Toutes priorités</option>
              <option value="URGENT">Urgentes</option>
              <option value="HIGH">Hautes</option>
              <option value="NORMAL">Normales</option>
              <option value="LOW">Basses</option>
            </select>
            <button
              type="button"
              onClick={selectAll}
              className="ml-auto text-[12px] text-primary-700 hover:underline"
            >
              Tout sélectionner
            </button>
          </div>

          {/* Liste */}
          <ul className="space-y-2">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <li key={i} className="h-20 animate-pulse rounded-lg bg-surface-alt" />
              ))
            ) : data?.items.length === 0 ? (
              <li className="rounded-lg border border-dashed border-line bg-white px-4 py-8 text-center text-[13px] text-ink-3">
                Aucune validation en attente.
              </li>
            ) : (
              data?.items.map((v) => {
                const isSelected = selected.has(v.id);
                const isExpanded = expandedId === v.id;
                return (
                  <li
                    key={v.id}
                    className={clsx(
                      "rounded-lg border bg-white shadow-card transition",
                      isSelected ? "border-primary-300 ring-2 ring-primary-100" : "border-line"
                    )}
                  >
                    <div className="flex items-start gap-3 p-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(v.id)}
                        className="mt-0.5 h-4 w-4 rounded border-line-2 text-primary-500 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-ink-3">{v.reference}</span>
                          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                            {TYPE_LABEL[v.type]}
                          </span>
                          <span
                            className={clsx(
                              "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                              PRIORITY_BADGE[v.priority]
                            )}
                          >
                            {v.priority}
                          </span>
                          {v.dueDate && (
                            <span className="text-[10.5px] text-ink-3">
                              Échéance {formatDate(v.dueDate)}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/validations/${v.id}`}
                          className="mt-1 block text-[14px] font-semibold text-ink hover:text-primary-700"
                        >
                          {v.title}
                        </Link>
                        <div className="mt-0.5 text-[11.5px] text-ink-3">
                          Initiée par {v.initiator}
                          {v.amount && (
                            <>
                              {" · "}
                              <span className="font-mono font-semibold text-ink">
                                {formatFCFA(BigInt(v.amount))}
                              </span>
                            </>
                          )}
                          {" · Étape : "}
                          <span className="font-semibold text-primary-700">{v.currentStep}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : v.id)}
                          className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
                          aria-label="Workflow visuel"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/validations/${v.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary-500 px-2.5 text-[12px] font-medium text-white hover:bg-primary-600"
                        >
                          Examiner
                        </Link>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-line bg-surface-alt p-3.5">
                        <WorkflowDiagram
                          steps={(v.workflow as { steps?: unknown[] })?.steps as never ?? []}
                          initiatorName={v.initiator}
                        />
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {selected.size > 0 && (
            <div className="mt-4">
              <BulkApproveBar
                selectedIds={Array.from(selected)}
                totalAmount={totalAmount}
                onClear={() => setSelected(new Set())}
              />
            </div>
          )}
        </>
      )}

      {tab === "history" && <ValidationHistoryTab />}
      {tab === "delegations" && <DelegationsTab />}
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className="mt-1 font-mono text-[20px] font-bold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}
