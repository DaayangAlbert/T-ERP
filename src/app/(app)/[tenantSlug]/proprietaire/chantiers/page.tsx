"use client";

import { clsx } from "clsx";
import { Building2 } from "lucide-react";
import { formatFCFA, formatPercent, formatDate } from "@/lib/format";
import { useOwnerChantiers } from "@/hooks/useOwnerDetails";
import { OwnerHeader, Section, BigStat, Explain, Pill, Loading, ErrorBox } from "@/components/owner/ui";

const f = (s: string) => formatFCFA(BigInt(s), { scale: "raw" });

export default function OwnerChantiersPage() {
  const { data, isLoading, isError } = useOwnerChantiers();

  if (isError) return <div className="space-y-4"><OwnerHeader title="Chantiers" subtitle="L'état de vos chantiers, en un coup d'œil." /><ErrorBox /></div>;
  if (isLoading || !data) return <div className="space-y-4"><OwnerHeader title="Chantiers" subtitle="L'état de vos chantiers, en un coup d'œil." /><Loading /></div>;

  return (
    <div className="space-y-4">
      <OwnerHeader title="Chantiers" subtitle="L'état de vos chantiers, en un coup d'œil." />

      <Section title="Vue d'ensemble" icon={<Building2 className="h-4 w-4" />}>
        <Explain>Un chantier <strong className="text-success">Va bien</strong> 🟢 est sur les rails ; <strong className="text-warning">À surveiller</strong> 🟠 demande de l&apos;attention ; <strong className="text-danger">En difficulté</strong> 🔴 a un retard ou un dépassement à traiter.</Explain>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BigStat label="Chantiers en cours" value={`${data.resume.actifs}`} tone={data.resume.enDifficulte > 0 ? "warn" : "ok"} explain="Nombre de chantiers actuellement en travaux." />
          <BigStat label="Vont bien" value={`${data.resume.vontBien}`} tone="ok" explain="Chantiers sans alerte particulière." />
          <BigStat label="À surveiller / en difficulté" value={`${data.resume.enDifficulte}`} tone={data.resume.enDifficulte > 0 ? "bad" : "ok"} explain="Chantiers qui méritent votre attention." />
          <BigStat label="Marge moyenne" value={formatPercent(data.resume.margeMoyenne)} tone={data.resume.margeMoyenne >= 15 ? "ok" : data.resume.margeMoyenne >= 8 ? "warn" : "bad"} explain="Bénéfice moyen attendu sur vos chantiers actifs." />
        </div>
        <p className="mt-3 text-[12.5px] text-ink-2">Valeur totale de vos chantiers : <strong>{f(data.resume.valeurTotale)}</strong> — c&apos;est le montant cumulé de tous vos marchés en cours.</p>
      </Section>

      <Section title="Détail par chantier">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead className="border-b border-line text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-2 py-2">Chantier</th>
                <th className="px-2 py-2">État</th>
                <th className="px-2 py-2 text-right">Avancement</th>
                <th className="px-2 py-2 text-right">Marge</th>
                <th className="px-2 py-2 text-right">Montant</th>
                <th className="px-2 py-2">Échéance</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-2 py-2">
                    <div className="font-medium text-ink">{s.name}</div>
                    <div className="text-[11px] text-ink-3">{s.client}{s.responsable ? ` · ${s.responsable}` : ""}</div>
                  </td>
                  <td className="px-2 py-2"><Pill tone={s.tone}>{s.sante}</Pill></td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
                        <div className={clsx("h-full rounded-full", s.tone === "bad" ? "bg-danger" : s.tone === "warn" ? "bg-warning" : "bg-success")} style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="tabular-nums text-ink-2">{s.progress}%</span>
                    </div>
                  </td>
                  <td className={clsx("px-2 py-2 text-right tabular-nums", s.margin >= 15 ? "text-success" : s.margin >= 8 ? "text-warning" : "text-danger")}>{formatPercent(s.margin)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{f(s.montant)}</td>
                  <td className="px-2 py-2 text-ink-3">{formatDate(s.echeance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
