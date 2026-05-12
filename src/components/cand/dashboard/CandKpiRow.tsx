"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CalendarClock,
  Sparkles,
  UserCheck,
} from "lucide-react";

interface KpiData {
  activeApplications: number;
  applicationsInInterview: number;
  upcomingInterviews: number;
  nextInterviewLabel: string | null;
  recommendations: number;
  profileCompletion: number;
  profileMissingHint: string | null;
}

interface KpiCardProps {
  label: string;
  value: string;
  meta: string;
  href: string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "success";
}

function KpiCard({ label, value, meta, href, icon: Icon, accent = "default" }: KpiCardProps) {
  const valueCls = clsx(
    "mt-2 text-3xl font-semibold tabular-nums",
    accent === "warning" && "text-amber-700",
    accent === "success" && "text-success",
    accent === "default" && "text-ink",
  );
  const borderCls = clsx(
    "rounded-lg border bg-white p-4 shadow-card transition-shadow hover:shadow-brand-lg",
    accent === "warning" && "border-amber-200",
    accent === "success" && "border-emerald-200",
    accent === "default" && "border-line",
  );
  return (
    <Link href={href} className={borderCls}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-3">
          {label}
        </div>
        <Icon className="h-4 w-4 text-ink-4" />
      </div>
      <div className={valueCls}>{value}</div>
      <div className="mt-1 text-xs text-ink-3">{meta}</div>
    </Link>
  );
}

export function CandKpiRow({ data }: { data: KpiData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Candidatures actives"
        value={String(data.activeApplications)}
        meta={
          data.activeApplications === 0
            ? "Postulez à une offre"
            : `${data.applicationsInInterview} en entretien · ${data.activeApplications - data.applicationsInInterview} en attente`
        }
        href="/cand/candidatures"
        icon={ClipboardList}
      />
      <KpiCard
        label="Prochains entretiens"
        value={String(data.upcomingInterviews)}
        meta={data.nextInterviewLabel ?? "Aucun à venir"}
        href="/cand/entretiens"
        icon={CalendarClock}
        accent={data.upcomingInterviews > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Offres pour vous"
        value={String(data.recommendations)}
        meta={data.recommendations > 0 ? "matching > 75%" : "Complétez votre profil"}
        href="/cand/offres"
        icon={Sparkles}
        accent={data.recommendations > 0 ? "success" : "default"}
      />
      <KpiCard
        label="Profil complété"
        value={`${data.profileCompletion}%`}
        meta={data.profileMissingHint ?? "Profil à jour"}
        href="/cand/profil"
        icon={UserCheck}
      />
    </div>
  );
}
