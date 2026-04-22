import { Download, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComptableDataTable } from "@/features/comptable/components/ComptableDataTable";
import { comptableTheme } from "@/features/comptable/theme";
import type { Payslip } from "@/features/comptable/types";

interface PersonalPayslipTableProps {
  payslips: Payslip[];
  paymentMethodLabel: string;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function buildDownloadHref(payslip: Payslip, paymentMethodLabel: string) {
  const content = [
    "T ERP - Mon bulletin de paie",
    `Periode: ${payslip.periodLabel}`,
    `Statut: ${payslip.status}`,
    `Net a payer: ${formatMoney(payslip.netAmount)}`,
    `Brut: ${formatMoney(payslip.grossAmount)}`,
    `Heures supplementaires: ${payslip.overtimeHours} h`,
    `Absences: ${payslip.absenceDays} jour(s)`,
    `Conges: ${payslip.leaveDays} jour(s)`,
    `Mode de paiement: ${paymentMethodLabel}`,
    `Date de paiement: ${formatDate(payslip.paymentDate)}`,
  ].join("\n");

  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

export function PersonalPayslipTable({ payslips, paymentMethodLabel }: PersonalPayslipTableProps) {
  if (!payslips.length) {
    return (
      <Card className="border-dashed text-sm text-black/72 dark:text-white/72">
        Aucun bulletin personnel disponible pour le moment.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Mes bulletins</p>
          <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>
            Tableau personnel uniquement. Les bulletins des autres employes restent classes dans Finance.
          </p>
        </div>
        <Badge variant="info">{payslips.length} bulletin(s)</Badge>
      </div>

      <ComptableDataTable
        rows={payslips}
        emptyText="Aucun bulletin personnel disponible."
        columns={[
          { key: "period", header: "Periode", render: (row) => <span className={`font-semibold ${comptableTheme.primaryText}`}>{row.periodLabel}</span> },
          { key: "status", header: "Statut", render: (row) => <Badge variant={row.status === "paid" ? "success" : row.status === "ready" ? "info" : "warning"}>{row.status}</Badge> },
          { key: "gross", header: "Brut", render: (row) => formatMoney(row.grossAmount) },
          { key: "net", header: "Net a payer", render: (row) => <span className={`font-semibold ${comptableTheme.primaryText}`}>{formatMoney(row.netAmount)}</span> },
          { key: "overtime", header: "Heures supp.", render: (row) => `${row.overtimeHours} h` },
          { key: "absence", header: "Absences", render: (row) => `${row.absenceDays} jour(s)` },
          { key: "paymentDate", header: "Paiement", render: (row) => formatDate(row.paymentDate) },
          {
            key: "download",
            header: "Telechargement",
            render: (row) => (
              <a href={buildDownloadHref(row, paymentMethodLabel)} download={row.fileName || `${row.monthKey}.txt`} className={comptableTheme.actionLink}>
                <Download className="mr-2 h-4 w-4" />
                Telecharger
              </a>
            ),
          },
        ]}
      />

      <div className="flex items-center gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/24 dark:text-emerald-200">
        <ShieldCheck className="h-4 w-4" />
        Ce tableau est reserve a l'employe connecte.
      </div>
    </div>
  );
}
