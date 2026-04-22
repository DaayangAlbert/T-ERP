import { useMemo, useState } from "react";
import { Download, FileClock, Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ComptableDataTable } from "@/features/comptable/components/ComptableDataTable";
import { comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import type { Payslip, ProofFile, WorkerProfile } from "@/features/comptable/types";

interface PayslipLibraryProps {
  payslips: Payslip[];
  proofsById: Record<string, ProofFile>;
  projects: Array<{ id: string; name: string }>;
  workers: WorkerProfile[];
  compact?: boolean;
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

function buildPayslipDownloadHref(payslip: Payslip, projectName: string) {
  const content = [
    "T ERP - Bulletin de paie",
    `Employe: ${payslip.employeeName}`,
    `Fonction: ${payslip.roleLabel}`,
    `Projet: ${projectName}`,
    `Periode: ${payslip.periodLabel}`,
    `Net a payer: ${formatMoney(payslip.netAmount)}`,
    `Heures supplementaires: ${payslip.overtimeHours} h`,
    `Absences: ${payslip.absenceDays} jour(s)`,
    `Date de paiement: ${formatDate(payslip.paymentDate)}`,
  ].join("\n");

  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
}

function statusVariant(status: Payslip["status"]) {
  if (status === "paid") {
    return "success";
  }
  if (status === "ready") {
    return "info";
  }
  return "warning";
}

export function PayslipLibrary({ payslips, proofsById, projects, workers, compact = false }: PayslipLibraryProps) {
  const [monthKey, setMonthKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const monthOptions = useMemo(() => [...new Set(payslips.map((payslip) => payslip.monthKey))], [payslips]);

  const visiblePayslips = payslips.filter((payslip) => {
    if (monthKey && payslip.monthKey !== monthKey) {
      return false;
    }
    if (projectId && payslip.projectId !== projectId) {
      return false;
    }
    if (employeeId && payslip.employeeId !== employeeId) {
      return false;
    }
    return true;
  });

  if (compact) {
    return (
      <div className="space-y-3">
        {visiblePayslips.slice(0, 3).map((payslip) => {
          const projectName = projects.find((project) => project.id === payslip.projectId)?.name || payslip.projectId;
          return (
            <div key={payslip.id} className={comptableTonePanel(statusVariant(payslip.status))}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>{payslip.employeeName}</p>
                  <p className={`text-sm ${comptableTheme.secondaryText}`}>{payslip.periodLabel}</p>
                </div>
                <Badge variant={statusVariant(payslip.status)}>{payslip.status}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>{projectName}</p>
                  <p className={`mt-1 text-sm font-semibold ${comptableTheme.primaryText}`}>{formatMoney(payslip.netAmount)}</p>
                </div>
                <a
                  href={buildPayslipDownloadHref(payslip, projectName)}
                  download={payslip.fileName || proofsById[payslip.proofId]?.name || `${payslip.monthKey}.txt`}
                  className={comptableTheme.actionLink}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Telecharger
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className={`${comptableTheme.insetPanel} flex items-center gap-3`}>
          <div className="rounded-2xl border border-black/8 bg-white/90 p-2.5 dark:border-white/10 dark:bg-slate-950/80">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className={`text-xs uppercase tracking-[0.18em] ${comptableTheme.subtleText}`}>Bibliotheque</p>
            <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>
              Filtrez par mois, projet et employe pour retrouver rapidement les bulletins.
            </p>
          </div>
        </div>
        <select className={comptableTheme.select} value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>
          <option value="">Tous les mois</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <select className={comptableTheme.select} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select className={comptableTheme.select} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">Tous les employes</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className={comptableTonePanel("neutral")}>
          <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Bulletins visibles</p>
          <p className={`mt-2 text-2xl font-semibold ${comptableTheme.primaryText}`}>{visiblePayslips.length}</p>
        </div>
        <div className={comptableTonePanel("info")}>
          <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Projet(s) filtres</p>
          <p className={`mt-2 text-2xl font-semibold ${comptableTheme.primaryText}`}>{projectId ? 1 : projects.length}</p>
        </div>
        <div className={comptableTonePanel("warning")}>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <p className={`text-sm font-medium ${comptableTheme.primaryText}`}>
              {monthKey || projectId || employeeId ? "Filtres actifs" : "Vue complete"}
            </p>
          </div>
          <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>
            Les bulletins restent organises dans Finance pour garder la paie terrain et les historiques au meme endroit.
          </p>
        </div>
      </div>

      <ComptableDataTable
        rows={visiblePayslips}
        emptyText="Aucun bulletin pour ces filtres."
        columns={[
          {
            key: "employee",
            header: "Employe",
            render: (row) => (
              <div>
                <p className={`font-semibold ${comptableTheme.primaryText}`}>{row.employeeName}</p>
                <p className={`text-xs ${comptableTheme.mutedText}`}>{row.roleLabel}</p>
              </div>
            ),
          },
          {
            key: "project",
            header: "Projet",
            render: (row) => projects.find((project) => project.id === row.projectId)?.name || row.projectId,
          },
          { key: "period", header: "Periode", render: (row) => row.periodLabel },
          { key: "status", header: "Statut", render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge> },
          { key: "amount", header: "Net a payer", render: (row) => <span className={`font-semibold ${comptableTheme.primaryText}`}>{formatMoney(row.netAmount)}</span> },
          { key: "overtime", header: "Heures supp.", render: (row) => `${row.overtimeHours} h` },
          { key: "absence", header: "Absences", render: (row) => `${row.absenceDays} jour(s)` },
          {
            key: "actions",
            header: "Actions",
            render: (row) => {
              const projectName = projects.find((project) => project.id === row.projectId)?.name || row.projectId;
              const downloadName = row.fileName || proofsById[row.proofId]?.name || `${row.monthKey}.txt`;

              return (
                <div className="flex flex-wrap gap-2">
                  <a href={buildPayslipDownloadHref(row, projectName)} download={downloadName} className={comptableTheme.actionLink}>
                    <Download className="mr-2 h-4 w-4" />
                    Telecharger
                  </a>
                  <span className={`${comptableTheme.actionLink} pointer-events-none`}>
                    <FileClock className="mr-2 h-4 w-4" />
                    {downloadName}
                  </span>
                </div>
              );
            },
          },
        ]}
      />

      {!visiblePayslips.length ? null : (
        <Card className={comptableTheme.insetPanel}>
          <p className={`text-sm font-medium ${comptableTheme.primaryText}`}>
            Les bulletins salaries sont consultables ici cote finance, tandis que Ma paie & conges reste strictement personnel.
          </p>
        </Card>
      )}
    </div>
  );
}
