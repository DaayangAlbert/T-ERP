"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, MessageSquare, X, UserPlus } from "lucide-react";
import { ValidationType, ValidationPriority } from "@prisma/client";
import { useApproveValidation, useValidationDetail } from "@/hooks/useValidations";
import { WorkflowDiagram } from "@/components/validations/WorkflowDiagram";
import { RejectModal } from "@/components/validations/RejectModal";
import { RequestInfoModal } from "@/components/validations/RequestInfoModal";
import { DelegateModal } from "@/components/validations/DelegateModal";
import { formatDate, formatFCFA } from "@/lib/format";
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

interface Props {
  params: { id: string };
}

export default function ValidationDetailPage({ params }: Props) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useValidationDetail(params.id);
  const approve = useApproveValidation();
  const [comment, setComment] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-1/2 animate-pulse rounded bg-surface-alt" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const onApprove = async () => {
    const res = await approve.mutateAsync({ id: data.id, comment: comment || undefined });
    if ((res as { isFinal?: boolean }).isFinal) {
      router.push("/validations");
    }
  };

  const isPending = data.status === "PENDING";

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <Link
            href="/validations"
            className="mb-1 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] text-ink-3">{data.reference}</span>
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
              {TYPE_LABEL[data.type]}
            </span>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                PRIORITY_BADGE[data.priority]
              )}
            >
              {data.priority}
            </span>
            <span
              className={clsx(
                "rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase",
                data.status === "PENDING"
                  ? "bg-warning/10 text-warning"
                  : data.status === "APPROVED"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {data.status}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">{data.title}</h1>
        </div>
      </header>

      {/* Workflow */}
      <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Workflow d'approbation
        </h2>
        <WorkflowDiagram
          steps={data.workflow?.steps ?? []}
          initiatorName={data.initiator.name}
        />
      </section>

      {/* Métadonnées */}
      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Initiateur">
          {data.initiator.name}
          <div className="text-[11px] text-ink-3">{data.initiator.position}</div>
        </Meta>
        {data.amount && (
          <Meta label="Montant">
            <span className="font-mono">{formatFCFA(BigInt(data.amount))}</span>
          </Meta>
        )}
        <Meta label="Créée le">{formatDate(data.createdAt)}</Meta>
        {data.dueDate && <Meta label="Échéance">{formatDate(data.dueDate)}</Meta>}
        {data.decidedBy && <Meta label="Décidé par">{data.decidedBy.name}</Meta>}
        {data.decisionAt && <Meta label="Date décision">{formatDate(data.decisionAt)}</Meta>}
      </section>

      {/* Description */}
      {data.description && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Description
          </h2>
          <p className="text-[13.5px] leading-relaxed text-ink-2">{data.description}</p>
        </section>
      )}

      {data.decisionReason && (
        <section className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800">
          <span className="font-semibold">Motif :</span> {data.decisionReason}
        </section>
      )}

      {/* Historique commentaires */}
      {data.comments && data.comments.length > 0 && (
        <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Activité
          </h2>
          <ul className="space-y-2">
            {data.comments.map((c) => (
              <li key={c.id} className="flex gap-2.5 text-[12.5px]">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />
                <div className="flex-1">
                  <div className="text-ink">
                    <span className="font-semibold">{c.authorName}</span>{" "}
                    <span className="text-[10.5px] uppercase tracking-wider text-ink-3">
                      {c.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-ink-2">{c.message}</p>
                  <span className="text-[10.5px] text-ink-3">{formatDate(c.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions DG */}
      {isPending && (
        <section className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-primary-800">
            Décision
          </h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Commentaire (optionnel)"
            className="mb-3 w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] focus:border-primary-300 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApprove}
              disabled={approve.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-success px-3.5 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> {approve.isPending ? "Approbation…" : "Approuver"}
            </button>
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-danger px-3.5 text-[12.5px] font-medium text-white hover:opacity-90"
            >
              <X className="h-4 w-4" /> Rejeter
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2 hover:border-primary-300"
            >
              <MessageSquare className="h-4 w-4" /> Demander justification
            </button>
            <button
              type="button"
              onClick={() => setDelegateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2 hover:border-primary-300"
            >
              <UserPlus className="h-4 w-4" /> Déléguer
            </button>
          </div>
        </section>
      )}

      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        validationId={data.id}
        validationTitle={data.title}
        onDone={() => router.push("/validations")}
      />
      <RequestInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        validationId={data.id}
        validationTitle={data.title}
      />
      <DelegateModal open={delegateOpen} onClose={() => setDelegateOpen(false)} />
    </>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 shadow-card">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink">{children}</div>
    </div>
  );
}
