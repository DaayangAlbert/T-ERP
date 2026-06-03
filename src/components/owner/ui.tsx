"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft } from "lucide-react";
import { useTenantHref } from "@/hooks/useTenantHref";

export const toneText: Record<string, string> = {
  ok: "text-success",
  warn: "text-warning",
  bad: "text-danger",
  neutral: "text-ink",
};
export const tonePill: Record<string, string> = {
  ok: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  bad: "bg-danger/10 text-danger",
  neutral: "bg-ink-3/10 text-ink-3",
};

/** En-tête de page avec retour vers le cockpit. */
export function OwnerHeader({ title, subtitle, help }: { title: string; subtitle: string; help?: React.ReactNode }) {
  const tenantHref = useTenantHref();
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
      <div>
        <Link href={tenantHref("/proprietaire")} className="mb-2 inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-primary-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">{subtitle}</p>
      </div>
      {help}
    </header>
  );
}

export function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon && <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-700">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Gros chiffre + explication en français simple. */
export function BigStat({ label, value, explain, tone = "neutral", suffix }: { label: string; value: string; explain: string; tone?: string; suffix?: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="text-[11.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("mt-0.5 text-2xl font-bold tabular-nums", toneText[tone] ?? "text-ink")}>
        {value} {suffix && <span className="text-sm font-medium text-ink-3">{suffix}</span>}
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{explain}</p>
    </div>
  );
}

/** Ligne libellé / valeur avec une explication optionnelle. */
export function Row({ label, value, tone = "neutral", explain }: { label: string; value: string; tone?: string; explain?: string }) {
  return (
    <div className="border-t border-line/60 py-2">
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className="text-ink-2">{label}</span>
        <span className={clsx("tabular-nums font-semibold", toneText[tone] ?? "text-ink")}>{value}</span>
      </div>
      {explain && <p className="mt-0.5 text-[11px] text-ink-3">{explain}</p>}
    </div>
  );
}

/** Encadré explicatif (ce que veut dire la section, en clair). */
export function Explain({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 rounded-lg bg-primary-50/50 px-3 py-2 text-[12px] leading-relaxed text-ink-2">{children}</p>;
}

export function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={clsx("rounded px-2 py-0.5 text-[11px] font-medium", tonePill[tone] ?? tonePill.neutral)}>{children}</span>;
}

export function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

export function ErrorBox() {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Impossible de charger ces informations.</div>;
}
