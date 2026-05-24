"use client";

import { clsx } from "clsx";
import { CalendarRange } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useOwnerPlanning } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Pill, Loading, ErrorBox } from "@/components/owner/ui";

export default function OwnerPlanningPage() {
  const { data, isLoading, isError } = useOwnerPlanning();
  const head = <OwnerHeader title="Planning des chantiers" subtitle="Les grandes activités de chaque chantier et leur avancement." />;

  if (isError) return <div className="space-y-4">{head}<ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4">{head}<Loading /></div>;

  return (
    <div className="space-y-4">
      {head}

      <Section title="Vue d'ensemble" icon={<CalendarRange className="h-4 w-4" />}>
        <Explain>Chaque chantier est découpé en <strong>phases</strong> (activités). Une phase <strong className="text-danger">en retard</strong> dépasse sa date de fin prévue sans être terminée.</Explain>
        <div className="grid gap-3 sm:grid-cols-3">
          <BigStat label="Chantiers planifiés" value={`${data.resume.chantiers}`} explain="Chantiers avec un planning défini." />
          <BigStat label="Activités (phases)" value={`${data.resume.phases}`} explain="Total des phases planifiées." />
          <BigStat label="En retard" value={`${data.resume.enRetard}`} tone={data.resume.enRetard > 0 ? "bad" : "ok"} explain="Phases qui dépassent leur échéance." />
        </div>
      </Section>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-[12.5px] text-ink-3">Aucun planning défini pour le moment.</div>
      ) : (
        data.items.map((s) => (
          <section key={s.code} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-ink"><span className="font-mono text-[11px] text-ink-3">{s.code}</span> {s.name}</h3>
              <span className="text-[12px] text-ink-3">Avancement global : <strong className="text-ink">{s.avancement}%</strong></span>
            </div>
            <div className="space-y-1.5">
              {s.phases.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 border-t border-line/60 py-1.5 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.nom}</span>
                  <Pill tone={p.tone}>{p.statut}</Pill>
                  <span className="text-[11px] text-ink-3">{formatDate(p.debut)} → {formatDate(p.fin)}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
                      <div className={clsx("h-full rounded-full", p.tone === "bad" ? "bg-danger" : "bg-success")} style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="tabular-nums text-[11px] text-ink-2">{p.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
