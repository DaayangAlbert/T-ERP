"use client";

import { useState } from "react";
import { CheckCircle2, Circle, AlertOctagon, Loader2, FileText, PlusCircle, X } from "lucide-react";
import { clsx } from "clsx";
import { Role } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import {
  usePaymentTrack,
  useValidateStep,
  useBlockStep,
  useUnblockStep,
  useToggleDocument,
  type PaymentStepStatus,
} from "@/hooks/usePaymentCircuits";

interface Props {
  trackId: string;
}

const STATUS_COLOR: Record<PaymentStepStatus, string> = {
  PENDING: "text-ink-3 bg-line/40",
  IN_PROGRESS: "text-info bg-info/10",
  VALIDATED: "text-success bg-success/10",
  BLOCKED: "text-danger bg-danger/10",
};

const STATUS_ICON: Record<PaymentStepStatus, React.ReactNode> = {
  PENDING: <Circle className="h-4 w-4" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 animate-spin" />,
  VALIDATED: <CheckCircle2 className="h-4 w-4" />,
  BLOCKED: <AlertOctagon className="h-4 w-4" />,
};

const STATUS_LABEL: Record<PaymentStepStatus, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  VALIDATED: "Validée",
  BLOCKED: "Bloquée",
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diffMs / 86_400_000);
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "hier";
  return `il y a ${d} j`;
}

export function PaymentTrackTimeline({ trackId }: Props) {
  const { user } = useAuth();
  const { data, isLoading } = usePaymentTrack(trackId);
  const validate = useValidateStep();
  const unblock = useUnblockStep();
  const toggleDoc = useToggleDocument();

  const [blockingStepId, setBlockingStepId] = useState<string | null>(null);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />;
  }

  const isDafOrAdmin = user?.role === Role.DAF || user?.role === Role.TENANT_ADMIN;
  const isAssignee = data.assignedTo?.id === user?.id;
  const canAct = isDafOrAdmin || isAssignee;

  const validatedCount = data.steps.filter((s) => s.status === "VALIDATED").length;
  const progress = Math.round((validatedCount / data.steps.length) * 100);

  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-3 shadow-card sm:p-4">
      {/* En-tête */}
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-2">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{data.template.name}</h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            {data.receivable.clientName} · {data.receivable.invoiceRef} ·
            assigné à{" "}
            <span className="font-medium text-ink">
              {data.assignedTo ? `${data.assignedTo.firstName} ${data.assignedTo.lastName}` : "—"}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-ink-3">
            {validatedCount} / {data.steps.length} étapes
          </div>
          <div className="mt-1 h-1.5 w-32 rounded-full bg-line">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Étapes */}
      <ol className="space-y-2">
        {data.steps.map((step) => {
          const isActive = step.status === "IN_PROGRESS" || step.status === "BLOCKED";
          return (
            <li key={step.id} className="relative">
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                    STATUS_COLOR[step.status],
                  )}
                >
                  {STATUS_ICON[step.status]}
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-line bg-surface-alt/30 p-2 sm:p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                        <span className="font-mono text-[10.5px] text-ink-3">#{step.order}</span>
                        {step.label}
                      </div>
                      <div className={clsx("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold", STATUS_COLOR[step.status])}>
                        {STATUS_LABEL[step.status]}
                      </div>
                      {step.validatedAt && step.validatedBy && (
                        <div className="mt-1 text-[10.5px] text-ink-3">
                          Validée {formatRelative(step.validatedAt)} par {step.validatedBy.firstName}{" "}
                          {step.validatedBy.lastName}
                        </div>
                      )}
                      {step.status === "BLOCKED" && step.blockedReason && (
                        <div className="mt-1 rounded border border-danger/30 bg-danger/5 p-2 text-[11px] text-danger">
                          <strong>Bloqué</strong>
                          {step.blockedSince && ` ${formatRelative(step.blockedSince)}`} :{" "}
                          {step.blockedReason}
                          {step.documents.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {step.documents.map((d) => (
                                <li key={d.id} className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleDoc.mutate({
                                        trackId: data.id,
                                        stepId: step.id,
                                        docId: d.id,
                                      })
                                    }
                                    disabled={!canAct}
                                    className={clsx(
                                      "h-4 w-4 rounded border flex items-center justify-center text-white text-[10px]",
                                      d.provided
                                        ? "bg-success border-success"
                                        : "bg-white border-line-2 hover:border-success",
                                    )}
                                    title={d.provided ? "Fourni" : "À fournir"}
                                  >
                                    {d.provided && "✓"}
                                  </button>
                                  <FileText className="h-3 w-3 flex-shrink-0 text-ink-3" />
                                  <span className={clsx(d.provided && "line-through text-ink-3")}>
                                    {d.label}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    {canAct && isActive && (
                      <div className="flex flex-shrink-0 gap-1.5">
                        {step.status === "BLOCKED" ? (
                          <button
                            type="button"
                            onClick={() => unblock.mutate({ trackId: data.id, stepId: step.id })}
                            disabled={unblock.isPending}
                            className="h-8 rounded-md border border-line-2 bg-white px-2 text-[11.5px] font-medium text-ink-2 hover:border-ink-3"
                          >
                            Lever blocage
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBlockingStepId(step.id)}
                            className="h-8 rounded-md border border-danger/40 bg-white px-2 text-[11.5px] font-medium text-danger hover:bg-danger/5"
                          >
                            Bloquer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => validate.mutate({ trackId: data.id, stepId: step.id })}
                          disabled={validate.isPending}
                          className="h-8 rounded-md bg-success px-2.5 text-[11.5px] font-semibold text-white hover:bg-success/90 disabled:opacity-60"
                        >
                          Valider l&apos;étape
                        </button>
                      </div>
                    )}
                  </div>

                  {blockingStepId === step.id && (
                    <BlockForm
                      trackId={data.id}
                      stepId={step.id}
                      onClose={() => setBlockingStepId(null)}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {data.completedAt && (
        <div className="rounded-md bg-success/10 p-2 text-center text-[12px] font-semibold text-success">
          ✓ Circuit terminé — paiement reçu attendu
        </div>
      )}
    </section>
  );
}

function BlockForm({
  trackId,
  stepId,
  onClose,
}: {
  trackId: string;
  stepId: string;
  onClose: () => void;
}) {
  const block = useBlockStep();
  const [reason, setReason] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [newDoc, setNewDoc] = useState("");

  const submit = async () => {
    if (reason.trim().length < 3) return;
    await block.mutateAsync({
      trackId,
      stepId,
      reason: reason.trim(),
      requiredDocuments: docs,
    });
    onClose();
  };

  return (
    <div className="mt-2 space-y-2 rounded-md border border-danger/30 bg-danger/5 p-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Motif du blocage (ex: pièces manquantes côté Mincom)"
        className="w-full rounded border border-line bg-white p-2 text-[12px]"
      />
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
          Documents à fournir
        </div>
        <ul className="mt-1 space-y-1">
          {docs.map((d, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[12px]">
              <FileText className="h-3 w-3 text-ink-3" />
              <span className="flex-1">{d}</span>
              <button
                type="button"
                onClick={() => setDocs(docs.filter((_, j) => j !== i))}
                className="text-ink-3 hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex gap-1">
          <input
            value={newDoc}
            onChange={(e) => setNewDoc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newDoc.trim()) {
                setDocs([...docs, newDoc.trim()]);
                setNewDoc("");
              }
            }}
            placeholder="Attestation fiscale 2026"
            className="h-8 flex-1 rounded border border-line bg-white px-2 text-[12px]"
          />
          <button
            type="button"
            onClick={() => {
              if (newDoc.trim()) {
                setDocs([...docs, newDoc.trim()]);
                setNewDoc("");
              }
            }}
            className="inline-flex h-8 items-center gap-1 rounded border border-line bg-white px-2 text-[11.5px] font-medium text-ink-2 hover:border-ink-3"
          >
            <PlusCircle className="h-3 w-3" /> Ajouter
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="h-8 rounded-md border border-line bg-white px-3 text-[11.5px] font-medium text-ink-2"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={block.isPending || reason.trim().length < 3}
          className="h-8 rounded-md bg-danger px-3 text-[11.5px] font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
        >
          {block.isPending ? "Blocage…" : "Bloquer l'étape"}
        </button>
      </div>
    </div>
  );
}
