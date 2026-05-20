import { Building2, Coins, Users, Activity, AlertTriangle } from "lucide-react";

interface Props {
  activeTenants: number;
  demoTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  mrrXAF: number;
  arrXAF: number;
  overdueInvoices: number;
  uptime: number;
}

function formatMoney(xaf: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(xaf));
}

export function AdminKpiRow(props: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        icon={<Building2 className="h-4 w-4" />}
        label="Tenants actifs"
        value={String(props.activeTenants)}
        meta={`${props.demoTenants} démo · ${props.suspendedTenants} suspendus`}
        accent="cyan"
      />
      <Card
        icon={<Coins className="h-4 w-4" />}
        label="MRR XAF"
        value={formatMoney(props.mrrXAF)}
        meta={`ARR ${formatMoney(props.arrXAF)}`}
        accent="cyan"
      />
      <Card
        icon={<Users className="h-4 w-4" />}
        label="Utilisateurs"
        value={props.totalUsers.toLocaleString("fr-FR")}
        meta="Tous tenants confondus"
        accent="default"
      />
      <Card
        icon={<Activity className="h-4 w-4" />}
        label="Uptime 30j"
        value={`${props.uptime.toFixed(2)} %`}
        meta={
          props.overdueInvoices > 0
            ? `${props.overdueInvoices} factures impayées`
            : "Aucune facture impayée"
        }
        accent={props.overdueInvoices > 0 ? "warn" : "success"}
        warn={props.overdueInvoices > 0}
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  meta,
  accent,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta: string;
  accent: "cyan" | "default" | "success" | "warn";
  warn?: boolean;
}) {
  const valueColor =
    accent === "cyan"
      ? "#22D3EE"
      : accent === "success"
        ? "#22C55E"
        : accent === "warn"
          ? "#F59E0B"
          : "#FFFFFF";
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#1E293B", borderColor: "#334155" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
          {label}
        </span>
        <span className="text-cyan-300/80">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-white/55">
        {warn ? (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            {meta}
          </span>
        ) : (
          meta
        )}
      </div>
    </div>
  );
}
