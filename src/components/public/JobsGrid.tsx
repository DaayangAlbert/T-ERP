"use client";

import type { PublicJob } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";

interface Props {
  jobs: PublicJob[];
  loading?: boolean;
  onApply?: (job: PublicJob) => void;
}

export function JobsGrid({ jobs, loading, onApply }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[235px] animate-pulse rounded-xl border border-line bg-white p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-md bg-surface-alt" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-surface-alt" />
                <div className="h-2.5 w-1/2 rounded bg-surface-alt" />
              </div>
            </div>
            <div className="mt-3 h-4 w-3/4 rounded bg-surface-alt" />
            <div className="mt-2 h-3 w-full rounded bg-surface-alt" />
            <div className="mt-1 h-3 w-5/6 rounded bg-surface-alt" />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-12 text-center">
        <p className="text-sm text-ink-3">Aucune offre ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onApply={onApply} />
      ))}
    </div>
  );
}
