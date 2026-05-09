"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useSocialIndicators } from "@/hooks/useHr";

export function SocialIndicatorsDashboard() {
  const { data, isLoading } = useSocialIndicators();
  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const latest = data.latest as
    | {
        turnover?: { rate: number };
        absenteeism?: { rate: number };
        seniorityAvg?: number;
        genderEquity?: { femaleRatio: number; femaleSalaryGap: number };
        climate?: { score: number; lastSurveyDate: string };
        conflicts?: number;
      }
    | null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Turnover annuel" value={latest?.turnover?.rate != null ? `${latest.turnover.rate.toFixed(1)} %` : "—"} tone={(latest?.turnover?.rate ?? 0) > 12 ? "warning" : "ok"} />
        <Kpi label="Absentéisme" value={latest?.absenteeism?.rate != null ? `${latest.absenteeism.rate.toFixed(1)} %` : "—"} tone={(latest?.absenteeism?.rate ?? 0) > 5 ? "warning" : "ok"} />
        <Kpi label="Ancienneté moy." value={latest?.seniorityAvg != null ? `${latest.seniorityAvg.toFixed(1)} ans` : "—"} />
        <Kpi label="Climat social /5" value={latest?.climate?.score != null ? `${latest.climate.score.toFixed(1)}` : "—"} />
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Pyramide des âges
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.agePyramid}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="#A855F7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Égalité H/F</h3>
          <dl className="space-y-2 text-[12.5px]">
            <Row label="Femmes dans l'effectif">
              {latest?.genderEquity?.femaleRatio != null
                ? `${(latest.genderEquity.femaleRatio * 100).toFixed(0)} %`
                : "—"}
            </Row>
            <Row label="Écart salarial F/H">
              {latest?.genderEquity?.femaleSalaryGap != null
                ? `${(latest.genderEquity.femaleSalaryGap * 100).toFixed(1)} %`
                : "—"}
            </Row>
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Climat / Conflits</h3>
          <dl className="space-y-2 text-[12.5px]">
            <Row label="Dernier sondage interne">
              {latest?.climate?.lastSurveyDate ?? "—"}
            </Row>
            <Row label="Conflits sociaux ouverts">
              {latest?.conflicts ?? 0}
            </Row>
          </dl>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warning" }) {
  return (
    <div
      className={
        "rounded-lg border p-3 shadow-card " +
        (tone === "warning" ? "border-warning/30 bg-warning/5" : "border-line bg-white")
      }
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}
