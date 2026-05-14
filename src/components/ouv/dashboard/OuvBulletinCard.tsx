"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Wallet } from "lucide-react";

interface Props {
  payslipId: string;
  periodLabel: string;
  netAmount: number;
  isNew: boolean;
}

// Card violet inline "Nouveau bulletin disponible" — pointe vers /ouv/paie.
// Affichée uniquement quand un bulletin récent existe (isNew = true).
export function OuvBulletinCard({ payslipId, periodLabel, netAmount, isNew }: Props) {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  return (
    <Link
      href={`/${tenantSlug}/ouv/paie`}
      className="mb-3.5 flex items-center gap-3 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-100 p-4"
      data-payslip-id={payslipId}
    >
      <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-purple-500 text-2xl text-white">
        <Wallet className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-bold leading-tight text-slate-900">
          {isNew ? "Nouveau bulletin disponible" : "Dernier bulletin"}
        </p>
        <p className="text-[14px] text-slate-600">
          {formatPeriodLabel(periodLabel)} · {formatFcfa(netAmount)} FCFA net
        </p>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-purple-500" strokeWidth={2.5} />
    </Link>
  );
}

function formatPeriodLabel(label: string): string {
  // "2026-04" → "Avril 2026"
  const match = label?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return label;
  const year = match[1];
  const monthIdx = parseInt(match[2], 10) - 1;
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  return `${months[monthIdx] ?? label} ${year}`;
}

function formatFcfa(n: number): string {
  return n.toLocaleString("fr-FR");
}
