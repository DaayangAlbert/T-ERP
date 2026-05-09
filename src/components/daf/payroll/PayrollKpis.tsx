"use client";

import { Users, Banknote, ShieldCheck, Wallet } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Props {
  bulletins: number;
  grossAmount: string;
  employerCharges: string;
  netToPay: string;
}

export function PayrollKpis({ bulletins, grossAmount, employerCharges, netToPay }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi icon={<Users className="h-4 w-4 text-info" />} label="Bulletins" value={String(bulletins)} />
      <Kpi icon={<Banknote className="h-4 w-4 text-primary-500" />} label="Masse brute" value={formatFCFA(BigInt(grossAmount))} highlight />
      <Kpi icon={<ShieldCheck className="h-4 w-4 text-warning" />} label="Charges patronales" value={formatFCFA(BigInt(employerCharges))} />
      <Kpi icon={<Wallet className="h-4 w-4 text-success" />} label="Net à virer" value={formatFCFA(BigInt(netToPay))} highlight />
    </div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border p-3 shadow-card sm:p-4 " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} {label}
      </div>
      <div className={"mt-1 font-mono text-[16px] font-bold tabular-nums sm:text-[18px] " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
