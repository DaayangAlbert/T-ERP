"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { PublicJob } from "@/hooks/useJobs";
import { formatDate, formatFCFA } from "@/lib/format";
import { ContractType } from "@prisma/client";

interface Props {
  job: PublicJob;
  onApply?: (job: PublicJob) => void;
}

const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  JOURNALIER: "Journalier",
  PRESTATAIRE: "Prestataire",
};

const CONTRACT_TONE: Record<ContractType, string> = {
  CDI: "bg-green-50 text-green-700 ring-green-200",
  CDD: "bg-amber-50 text-amber-700 ring-amber-200",
  STAGE: "bg-sky-50 text-sky-700 ring-sky-200",
  JOURNALIER: "bg-rose-50 text-rose-700 ring-rose-200",
  PRESTATAIRE: "bg-slate-50 text-slate-700 ring-slate-200",
};

function salaryRange(min: string | null, max: string | null) {
  if (!min && !max) return null;
  const fmt = (s: string) => formatFCFA(BigInt(s)).replace(" FCFA", "");
  if (min && max) return `${fmt(min)} – ${fmt(max)} FCFA`;
  return `${fmt(min ?? max!)} FCFA`;
}

export function JobCard({ job, onApply }: Props) {
  const tenantInitial = job.tenant.name.charAt(0).toUpperCase();
  const accent = job.tenant.primaryColor || "#A855F7";

  return (
    <article className="group flex flex-col rounded-xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-brand-lg">
      <Link href={`/jobs/${job.id}`} className="flex items-center gap-2.5">
        <div
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md text-sm font-bold text-white"
          style={{ background: accent }}
        >
          {tenantInitial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{job.tenant.name}</div>
          <div className="truncate text-[11.5px] text-ink-3">
            {[job.region, job.department].filter(Boolean).join(" · ")}
          </div>
        </div>
      </Link>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
            CONTRACT_TONE[job.contractType]
          )}
        >
          {CONTRACT_LABELS[job.contractType]}
        </span>
        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 ring-1 ring-primary-200">
          {job.category}
        </span>
        {job.positions > 1 && (
          <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink-2 ring-1 ring-line-2">
            {job.positions} postes
          </span>
        )}
      </div>

      <Link href={`/jobs/${job.id}`} className="mt-2.5 block">
        <h3 className="line-clamp-2 text-[15px] font-semibold text-ink group-hover:text-primary-700">
          {job.title}
        </h3>
      </Link>

      <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-ink-3">
        {salaryRange(job.salaryMin, job.salaryMax) ? (
          <span className="font-mono font-medium tabular-nums text-ink-2">
            {salaryRange(job.salaryMin, job.salaryMax)}
          </span>
        ) : (
          <span className="italic text-ink-4">Salaire négociable</span>
        )}
        {job.expiresAt && (
          <span>
            Limite {formatDate(job.expiresAt, "dd/MM")}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onApply?.(job)}
        className="mt-3 h-9 w-full rounded-md bg-primary-500 px-3 text-[13px] font-medium text-white transition hover:bg-primary-600 hover:shadow-brand"
      >
        Postuler
      </button>
    </article>
  );
}
