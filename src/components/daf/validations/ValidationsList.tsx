"use client";

import { useState } from "react";
import { Check, X, MessageSquare, AlertOctagon } from "lucide-react";
import { ValidationType, ValidationPriority, Role } from "@prisma/client";
import { useApproveValidation, useBulkApprove } from "@/hooks/useValidations";
import { RejectModal } from "@/components/validations/RejectModal";
import { RequestInfoModal } from "@/components/validations/RequestInfoModal";
import { WorkflowInline } from "./WorkflowInline";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

const TYPE_LABEL: Record<ValidationType, string> = {
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

const PRIORITY_BADGE: Record<ValidationPriority, string> = {
  LOW: "bg-ink-3/10 text-ink-3",
  NORMAL: "bg-info/10 text-info",
  HIGH: "bg-warning/10 text-warning",
  URGENT: "bg-danger/10 text-danger",
};

interface Item {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  amount: string | null;
  priority: ValidationPriority;
  initiator: string;
  initiatorPosition: string | null;
  workflow: { steps: Array<{ key: string; label: string; role: Role; status: string }> };
  ageDays: number;
}

export function ValidationsList({ items, onChange }: { items: Item[]; onChange?: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectId, setRejectId] = useState<{ id: string; title: string } | null>(null);
  const [infoId, setInfoId] = useState<{ id: string; title: string } | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const approve = useApproveValidation();
  const bulk = useBulkApprove();
  const { user } = useAuth();
  const canAct = user?.role === "DAF";

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const totalSelected = Array.from(selected).reduce((sum, id) => {
    const v = items.find((x) => x.id === id);
    return v?.amount ? sum + BigInt(v.amount) : sum;
  }, 0n);

  const onApprove = async (id: string) => {
    await approve.mutateAsync({ id, comment: comment[id] || undefined });
    onChange?.();
  };

  const onBulk = async () => {
    if (!confirm(`Valider ${selected.size} validation${selected.size > 1 ? "s" : ""} en lot ?`)) return;
    await bulk.mutateAsync({ ids: Array.from(selected) });
    setSelected(new Set());
    onChange?.();
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-6 text-center text-[13px] text-success">
        ✓ Aucune validation N2 en attente.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((v) => {
          const isSelected = selected.has(v.id);
          return (
            <li
              key={v.id}
              className={clsx(
                "rounded-xl border bg-white p-3 shadow-card sm:p-4",
                isSelected ? "border-primary-300 ring-2 ring-primary-100" : "border-line"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(v.id)}
                  disabled={!canAct}
                  className="mt-1 h-4 w-4 rounded border-line-2 text-primary-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] text-ink-3">{v.reference}</span>
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700">
                      {TYPE_LABEL[v.type]}
                    </span>
                    <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY_BADGE[v.priority])}>
                      {v.priority === "URGENT" && <AlertOctagon className="mr-0.5 inline h-2.5 w-2.5" />}
                      {v.priority}
                    </span>
                    {v.ageDays > 5 && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        J+{v.ageDays}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-[13.5px] font-semibold text-ink sm:text-[14px]">{v.title}</h3>
                  <div className="text-[11px] text-ink-3">
                    {v.initiator}
                    {v.initiatorPosition && ` · ${v.initiatorPosition}`}
                    {v.amount && (
                      <span className="ml-1 font-mono font-semibold text-ink">
                        · {formatFCFA(BigInt(v.amount))}
                      </span>
                    )}
                  </div>
                  {/* Workflow inline : horizontal sm+, vertical mobile */}
                  <div className="mt-2 hidden sm:block">
                    <WorkflowInline steps={v.workflow.steps} initiatorName={v.initiator} />
                  </div>
                  <div className="mt-2 sm:hidden">
                    <WorkflowInline steps={v.workflow.steps} initiatorName={v.initiator} vertical />
                  </div>
                </div>
              </div>

              {canAct && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={comment[v.id] ?? ""}
                    onChange={(e) => setComment((s) => ({ ...s, [v.id]: e.target.value }))}
                    placeholder="Commentaire (optionnel)"
                    className="h-10 rounded-md border border-line bg-white px-2.5 text-[13px]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(v.id)}
                      disabled={approve.isPending}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-success px-3 text-[13px] font-medium text-white hover:opacity-90 sm:flex-none"
                    >
                      <Check className="h-4 w-4" /> Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectId({ id: v.id, title: v.title })}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-danger px-3 text-[13px] font-medium text-white hover:opacity-90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInfoId({ id: v.id, title: v.title })}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[13px] text-ink-2 hover:border-primary-300"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Bottom sheet sticky pour validation en lot */}
      {selected.size > 0 && canAct && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:bottom-4 sm:left-1/2 sm:right-auto sm:max-w-md sm:-translate-x-1/2 sm:rounded-xl sm:border">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-ink">
                {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
              </div>
              {totalSelected > 0n && (
                <div className="text-[11px] text-ink-3">Total {formatFCFA(totalSelected)}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-ink-3 hover:text-ink"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onBulk}
              disabled={bulk.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-success px-4 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> Valider en lot ({selected.size})
            </button>
          </div>
        </div>
      )}

      {rejectId && (
        <RejectModal
          open={true}
          onClose={() => setRejectId(null)}
          validationId={rejectId.id}
          validationTitle={rejectId.title}
          onDone={() => onChange?.()}
        />
      )}
      {infoId && (
        <RequestInfoModal
          open={true}
          onClose={() => setInfoId(null)}
          validationId={infoId.id}
          validationTitle={infoId.title}
        />
      )}
    </>
  );
}
