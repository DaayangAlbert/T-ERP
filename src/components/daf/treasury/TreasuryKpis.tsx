"use client";

import { ArrowDownLeft, ArrowUpRight, TrendingUp, Calendar } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  kpis: { receipts: string; payments: string; projectedJ7: string; dueTomorrow: string };
}

export function TreasuryKpis({ kpis }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<ArrowDownLeft className="h-4 w-4 text-success" />} label="Encaissements jour" value={formatFCFA(BigInt(kpis.receipts))} tone="success" />
      <Kpi icon={<ArrowUpRight className="h-4 w-4 text-danger" />} label="Décaissements jour" value={formatFCFA(BigInt(kpis.payments))} tone="danger" />
      <Kpi icon={<TrendingUp className="h-4 w-4 text-primary-500" />} label="Projeté J+7" value={formatFCFA(BigInt(kpis.projectedJ7))} tone="primary" />
      <Kpi icon={<Calendar className="h-4 w-4 text-warning" />} label="À payer demain" value={formatFCFA(BigInt(kpis.dueTomorrow))} tone="warning" />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "danger" | "primary" | "warning";
}) {
  const cls =
    tone === "success" ? "border-success/30 bg-success/5" :
    tone === "danger" ? "border-danger/30 bg-danger/5" :
    tone === "primary" ? "border-primary-300 bg-primary-50" :
    "border-warning/30 bg-warning/5";
  const valCls =
    tone === "success" ? "text-success" :
    tone === "danger" ? "text-danger" :
    tone === "primary" ? "text-primary-800" :
    "text-warning";
  return (
    <div className={`rounded-xl border p-3 shadow-card sm:p-4 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={`mt-1 font-mono text-[16px] font-bold tabular-nums sm:text-[18px] ${valCls}`}>{value}</div>
    </div>
  );
}
