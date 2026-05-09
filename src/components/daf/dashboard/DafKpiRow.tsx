"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";
import Link from "next/link";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

interface Trend {
  day: number;
  value: number;
}

interface PrimaryKpis {
  receipts: { value: string; trend: Trend[] };
  payments: { value: string; trend: Trend[] };
  pendingValidations: { count: number; amount: string };
  dso: { value: number; alert: boolean };
}

interface SecondaryKpis {
  taxDeadlines: { count: number; amount: string; urgent: number };
  overdueReceivables: { amount: string };
  ytdMargin: { value: number };
  bfr: { days: number };
}

export function DafKpiRow({ primary, secondary }: { primary: PrimaryKpis; secondary: SecondaryKpis }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Encaissements jour"
          value={formatFCFA(BigInt(primary.receipts.value))}
          tone="success"
          trend={primary.receipts.trend}
          trendColor="#15803D"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Décaissements jour"
          value={formatFCFA(BigInt(primary.payments.value))}
          tone="danger"
          trend={primary.payments.trend}
          trendColor="#B91C1C"
          icon={<TrendingDown className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="Validations N2"
          value={`${primary.pendingValidations.count}`}
          subtitle={formatFCFA(BigInt(primary.pendingValidations.amount))}
          tone={primary.pendingValidations.count > 5 ? "warning" : "primary"}
          href="/daf/validations"
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label="DSO clients"
          value={`${primary.dso.value} j`}
          tone={primary.dso.alert ? "warning" : "ok"}
          icon={primary.dso.alert ? <AlertCircle className="h-3.5 w-3.5" /> : null}
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Échéances 30 j"
          value={`${secondary.taxDeadlines.count}`}
          subtitle={formatFCFA(BigInt(secondary.taxDeadlines.amount))}
          tone={secondary.taxDeadlines.urgent > 0 ? "danger" : "ok"}
          href="/daf/fiscal"
        />
        <KpiCard
          label="Créances échues"
          value={formatFCFA(BigInt(secondary.overdueReceivables.amount))}
          tone="danger"
          href="/daf/recouvrement"
        />
        <KpiCard
          label="Marge YTD"
          value={`${secondary.ytdMargin.value.toFixed(1).replace(".", ",")} %`}
          tone={secondary.ytdMargin.value < 12 ? "warning" : "ok"}
        />
        <KpiCard
          label="BFR (jours CA)"
          value={`${secondary.bfr.days} j`}
          tone={secondary.bfr.days > 90 ? "warning" : "ok"}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  tone,
  trend,
  trendColor,
  icon,
  href,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone: "primary" | "success" | "warning" | "danger" | "ok";
  trend?: Trend[];
  trendColor?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const cls = clsx(
    "rounded-xl border p-3 shadow-card transition active:scale-[0.99] sm:p-4",
    tone === "primary" && "border-primary-300 bg-primary-50",
    tone === "success" && "border-success/30 bg-success/5",
    tone === "warning" && "border-warning/30 bg-warning/5",
    tone === "danger" && "border-danger/30 bg-danger/5",
    tone === "ok" && "border-line bg-white",
    href && "cursor-pointer hover:border-primary-400 hover:shadow-brand-lg"
  );
  const valueCls = clsx(
    "mt-1 font-mono font-bold tabular-nums text-[18px] sm:text-[20px]",
    tone === "primary" && "text-primary-800",
    tone === "success" && "text-success",
    tone === "warning" && "text-warning",
    tone === "danger" && "text-danger",
    tone === "ok" && "text-ink"
  );
  const inner = (
    <>
      <div className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </div>
      <div className={valueCls}>{value}</div>
      {subtitle && <div className="text-[11px] text-ink-3">{subtitle}</div>}
      {trend && trend.length > 0 && (
        <div className="mt-2 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line type="monotone" dataKey="value" stroke={trendColor ?? "#A855F7"} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
