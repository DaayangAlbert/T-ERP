"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Briefcase, Coins, Clock } from "lucide-react";

export interface TenantJobSummary {
  id: string;
  reference: string;
  slug: string | null;
  title: string;
  department: string | null;
  contractType: string;
  category: string;
  summary: string | null;
  region: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceMin: number | null;
  publishedAt: string | null;
  positions: number;
}

interface Props {
  jobs: TenantJobSummary[];
  primaryColor: string | null;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
  if (min === null) return `≤ ${fmt(max!)} FCFA`;
  if (max === null) return `≥ ${fmt(min)} FCFA`;
  return `${fmt(min)} - ${fmt(max)} FCFA`;
}

export function JobsListSection({ jobs, primaryColor }: Props) {
  const [q, setQ] = useState("");
  const [contract, setContract] = useState("");
  const [region, setRegion] = useState("");

  const regions = useMemo(
    () =>
      Array.from(new Set(jobs.map((j) => j.region).filter((x): x is string => !!x))),
    [jobs],
  );
  const contracts = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.contractType))),
    [jobs],
  );

  const filtered = jobs.filter((j) => {
    if (
      q &&
      !j.title.toLowerCase().includes(q.toLowerCase()) &&
      !(j.summary ?? "").toLowerCase().includes(q.toLowerCase())
    )
      return false;
    if (contract && j.contractType !== contract) return false;
    if (region && j.region !== region) return false;
    return true;
  });

  return (
    <section id="offres" className="bg-surface-alt py-16">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold text-ink md:text-3xl">
            {filtered.length} offre{filtered.length > 1 ? "s" : ""} ouverte
            {filtered.length > 1 ? "s" : ""}
          </h2>
          <Link
            href="#spontanee"
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            Pas l&apos;offre que vous cherchez ? Candidature spontanée →
          </Link>
        </header>

        {/* Filtres */}
        <div className="mb-4 grid gap-2 rounded-lg bg-white p-3 shadow-card md:grid-cols-[1fr_180px_180px]">
          <div className="flex items-center gap-2 rounded-md border border-line-2 bg-white px-3">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Métier, mot-clé…"
              className="flex-1 border-none bg-transparent py-2 text-sm outline-none"
            />
          </div>
          <select
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            className="rounded-md border border-line-2 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous contrats</option>
            {contracts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-md border border-line-2 bg-white px-3 py-2 text-sm"
          >
            <option value="">Toutes localisations</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-ink-3">
            Aucune offre ne correspond. Essayez d&apos;élargir vos critères.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((j) => (
              <JobCard key={j.id} job={j} primaryColor={primaryColor} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function JobCard({
  job,
  primaryColor,
}: {
  job: TenantJobSummary;
  primaryColor: string | null;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const target = job.slug ?? job.id;
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-card transition-shadow hover:shadow-brand-lg">
      <Link href={`/recrutement/${target}`} className="block p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {job.contractType}
              </span>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                {job.category}
              </span>
              <span className="text-[11px] text-ink-3">{job.reference}</span>
              {job.positions > 1 ? (
                <span className="text-[11px] font-semibold text-amber-700">
                  {job.positions} postes
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-base font-semibold text-ink">{job.title}</h3>
            {job.summary ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{job.summary}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-3">
              {job.region ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {job.region}
                </span>
              ) : null}
              {salary ? (
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3 w-3" /> {salary}
                </span>
              ) : null}
              {job.experienceMin !== null && job.experienceMin > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {job.experienceMin}+ ans
                </span>
              ) : null}
              {job.publishedAt ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(job.publishedAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              ) : null}
            </div>
          </div>
          <span
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-brand"
            style={{ background: primaryColor ?? "#A855F7" }}
          >
            Postuler
          </span>
        </div>
      </Link>
    </article>
  );
}
