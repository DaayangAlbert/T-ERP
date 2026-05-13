"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useFilialeDetail } from "@/hooks/useDgConsolidation";
import { ProgressInline } from "@/components/sites/ProgressInline";
import { formatFCFA } from "@/lib/format";
import { SiteStatus } from "@prisma/client";
import { clsx } from "clsx";

interface Props {
  params: { filialeId: string };
}

const STATUS_LABELS: Record<SiteStatus, string> = {
  PLANNED: "Planifié",
  ACTIVE: "Actif",
  ON_HOLD: "Suspendu",
  AT_RISK: "Vigilance",
  DRIFTING: "En dérive",
  COMPLETED: "Terminé",
  ARCHIVED: "Archivé",
};

const STATUS_TONE: Record<SiteStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  DRIFTING: "bg-rose-100 text-rose-700",
  COMPLETED: "bg-primary-100 text-primary-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default function FilialeDetailPage({ params }: Props) {
  const { data, isLoading, isError, error } = useFilialeDetail(params.filialeId);

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
        <div className="h-8 w-1/3 animate-pulse rounded bg-surface-alt" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  const { filiale, kpis, sites } = data;
  const ca = formatFCFA(kpis.ca, { splitUnit: true });
  const treasury = formatFCFA(kpis.treasury, { splitUnit: true });

  return (
    <>
      <Link
        href="/direction-generale/consolidation"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la consolidation
      </Link>

      <header
        className="mb-5 overflow-hidden rounded-xl text-white"
        style={{
          background: `linear-gradient(135deg,${filiale.color || "#A855F7"} 0%, #2A1B3D 100%)`,
        }}
      >
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div
            className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-white/15 text-2xl font-bold"
          >
            {filiale.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-white/70">
              Filiale du groupe {filiale.parent?.name ?? "—"}
            </div>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{filiale.name}</h1>
            <div className="mt-1 text-[12.5px] text-white/80">
              Secteur : <span className="font-medium">{filiale.sector ?? "—"}</span>
              {" · "}
              <span className="font-mono">{filiale.slug}.terp.cm</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="CA YTD" value={ca.value} unit={ca.unit} />
        <Stat
          label="Marge moyenne"
          value={kpis.margin.toFixed(1).replace(".", ",")}
          unit="%"
          tone={kpis.margin < 10 ? "danger" : kpis.margin < 15 ? "warning" : "success"}
        />
        <Stat label="Trésorerie" value={treasury.value} unit={treasury.unit} />
        <Stat label="Chantiers actifs" value={kpis.sitesCount.toString()} />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Chantiers de la filiale</h2>
          <span className="text-[11.5px] text-ink-3">{sites.length} au total</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2.5 pl-4 text-left">Code</th>
                <th className="py-2.5 text-left">Libellé</th>
                <th className="py-2.5 text-left">Avancement</th>
                <th className="py-2.5 text-right">Marge</th>
                <th className="py-2.5 text-right">Budget</th>
                <th className="py-2.5 pr-4 text-left">État</th>
              </tr>
            </thead>
            <tbody>
              {sites.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-ink-3">
                    Aucun chantier rattaché à cette filiale.
                  </td>
                </tr>
              )}
              {sites.map((s, i) => (
                <tr
                  key={s.id}
                  className={clsx(
                    "transition hover:bg-surface-alt",
                    i < sites.length - 1 && "border-b border-line"
                  )}
                >
                  <td className="py-2.5 pl-4">
                    <Link
                      href={`/chantiers/${s.id}`}
                      className="rounded bg-surface-alt px-2 py-0.5 font-mono text-[11.5px] text-ink-2 hover:text-primary-700"
                    >
                      {s.code}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <Link href={`/chantiers/${s.id}`} className="hover:text-primary-700">
                      <div className="font-semibold text-ink">{s.name}</div>
                      <div className="text-[11px] text-ink-3">{s.client}</div>
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <ProgressInline progress={s.progress} status={s.status} />
                  </td>
                  <td
                    className={clsx(
                      "py-2.5 text-right font-mono font-semibold tabular-nums",
                      s.margin < 10 ? "text-danger" : s.margin < 15 ? "text-warning" : "text-success"
                    )}
                  >
                    {s.margin.toFixed(1).replace(".", ",")} %
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-2">
                    {formatFCFA(BigInt(s.budget))}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                        STATUS_TONE[s.status]
                      )}
                    >
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-[11.5px] text-ink-3">
        Vue détaillée d'une filiale du groupe. La structure complète (alertes,
        validations, équipes) sera enrichie en Bloc 2.
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-2 font-semibold leading-none">
        <span className={`font-mono text-[22px] tabular-nums ${toneClass}`}>{value}</span>
        {unit && <span className="ml-1 text-[12px] font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
