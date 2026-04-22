import { CalendarClock, CircleAlert, Clock3, TimerReset, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AttendanceComposer } from "@/features/comptable/components/AttendanceComposer";
import { ComptableChartCard } from "@/features/comptable/components/ComptableChartCard";
import { ComptableDataTable } from "@/features/comptable/components/ComptableDataTable";
import { ComptableHero } from "@/features/comptable/components/ComptableHero";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { comptableProjectPill, comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import { useComptableWorkspace } from "@/features/comptable/hooks/useComptableWorkspace";

function formatHours(value: number) {
  return `${Number(value || 0).toFixed(1)} h`;
}

export function ComptableAttendancePage() {
  const workspace = useComptableWorkspace();
  const totalByDay = Math.max(
    ...workspace.attendanceTrend.map((point) => point.present + point.late + point.absent),
    1
  );
  const personalAttendance = workspace.workspace.personalAttendanceSummary;

  return (
    <div className={comptableTheme.page}>
      <ComptableHero
        eyebrow="Presence & temps de travail"
        title="Suivi des equipes projet"
        description="Saisie des presences, absences, retards et heures supplementaires. Les directeurs de projet sont exclus du suivi de pointage."
        stats={[
          { label: "Presents", value: String(workspace.totals.presentCount) },
          { label: "Retards", value: String(workspace.totals.lateCount) },
          { label: "Absences", value: String(workspace.totals.absenceCount) },
          { label: "Heures supp.", value: formatHours(workspace.totals.overtimeHours) },
        ]}
        sideContent={
          <Card className={`${comptableTheme.insetPanel} space-y-3 shadow-none`}>
            <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>Regle metier</p>
            <p className={`text-sm ${comptableTheme.secondaryText}`}>
              Le directeur de projet n'apparait pas dans la liste de pointage. Les retardataires et absences sont prets pour rapprochement paie.
            </p>
            <div className={comptableTonePanel("warning")}>
              <p className={`text-xs uppercase tracking-[0.16em] ${comptableTheme.subtleText}`}>Mon recap</p>
              <p className={`mt-2 text-sm ${comptableTheme.primaryText}`}>
                {personalAttendance.lateCount} retards, {personalAttendance.absenceCount} absences, {personalAttendance.overtimeHours.toFixed(1)} h supp.
              </p>
            </div>
          </Card>
        }
      />

      <div className="flex flex-wrap gap-2">
        {workspace.workspace.projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => workspace.actions.setSelectedProjectId(project.id)}
            className={comptableProjectPill(workspace.selectedProject?.id === project.id)}
          >
            {project.code} - {project.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className={comptableTheme.strongPanel}>
          <AttendanceComposer
            workers={workspace.attendanceWorkers}
            projects={workspace.workspace.projects}
            defaultProjectId={workspace.selectedProject?.id}
            onSubmit={workspace.actions.createAttendanceRecord}
          />
        </Card>

        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection
            eyebrow="Focus"
            title="Anomalies a traiter"
            description="Retards, absences et heures supplementaires les plus sensibles du projet actif."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {workspace.scopedAttendance
              .filter((record) => record.status !== "present")
              .slice(0, 4)
              .map((record) => (
                <div key={record.id} className={comptableTonePanel(record.status === "absent" ? "danger" : record.status === "late" ? "warning" : "info")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-semibold ${comptableTheme.primaryText}`}>{record.employeeName}</p>
                    <Badge variant={record.status === "absent" ? "danger" : record.status === "late" ? "warning" : "info"}>
                      {record.status}
                    </Badge>
                  </div>
                  <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>{record.roleLabel}</p>
                  <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>
                    {record.minutesLate ? `${record.minutesLate} min de retard` : `Heures supp. ${formatHours(record.overtimeHours)}`}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ComptableChartCard
          eyebrow="Statistiques"
          title="Evolution des presences"
          description="Barres journalieres pour presents, retards et absences."
        >
          <div className="grid grid-cols-6 gap-3">
            {workspace.attendanceTrend.map((point) => (
              <div key={point.label} className={comptableTonePanel("neutral")}>
                <div className="flex h-40 items-end justify-center gap-1">
                  <div className="w-3 rounded-t-full bg-emerald-500" style={{ height: `${Math.max(12, (point.present / totalByDay) * 140)}px` }} />
                  <div className="w-3 rounded-t-full bg-amber-500" style={{ height: `${Math.max(12, (point.late / totalByDay) * 140)}px` }} />
                  <div className="w-3 rounded-t-full bg-rose-500" style={{ height: `${Math.max(12, (point.absent / totalByDay) * 140)}px` }} />
                </div>
                <p className={`mt-3 text-center text-sm font-semibold ${comptableTheme.primaryText}`}>{point.label}</p>
              </div>
            ))}
          </div>
        </ComptableChartCard>

        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection eyebrow="KPI presence" title="Lecture rapide" description="Indicateurs operationnels utiles pour rapprocher la paie." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={comptableTonePanel("success")}>
              <UserCheck className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Employes suivis</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.attendanceWorkers.length}</p>
            </div>
            <div className={comptableTonePanel("warning")}>
              <Clock3 className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Retards</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.totals.lateCount}</p>
            </div>
            <div className={comptableTonePanel("danger")}>
              <CircleAlert className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Absences</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.totals.absenceCount}</p>
            </div>
            <div className={comptableTonePanel("info")}>
              <TimerReset className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Heures supp.</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{formatHours(workspace.totals.overtimeHours)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Registre"
          title="Historique des pointages"
          description="Heures d'arrivee, heures de depart, retards, absences et heures supplementaires."
        />
        <ComptableDataTable
          rows={workspace.scopedAttendance}
          emptyText="Aucun pointage pour ce projet."
          columns={[
            {
              key: "employee",
              header: "Employe",
              render: (row) => (
                <div>
                  <p className={`font-medium ${comptableTheme.primaryText}`}>{row.employeeName}</p>
                  <p className={`text-xs ${comptableTheme.subtleText}`}>{row.roleLabel}</p>
                </div>
              ),
            },
            { key: "date", header: "Date", render: (row) => row.date },
            { key: "arrival", header: "Arrivee", render: (row) => row.arrivalTime || "-" },
            { key: "departure", header: "Depart", render: (row) => row.departureTime || "-" },
            { key: "status", header: "Statut", render: (row) => <Badge variant={row.status === "absent" ? "danger" : row.status === "late" ? "warning" : row.status === "overtime" ? "info" : "success"}>{row.status}</Badge> },
            { key: "notes", header: "Note", render: (row) => row.notes || `${row.minutesLate} min / ${formatHours(row.overtimeHours)}` },
          ]}
        />
      </Card>
    </div>
  );
}
