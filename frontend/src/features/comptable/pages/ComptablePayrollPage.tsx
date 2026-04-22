import { CalendarRange, Clock3, CreditCard, FileText, PlaneTakeoff, TimerReset } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComptableHero } from "@/features/comptable/components/ComptableHero";
import { ComptableSection } from "@/features/comptable/components/ComptableSection";
import { PersonalPayslipTable } from "@/features/comptable/components/PersonalPayslipTable";
import { comptableTheme, comptableTonePanel } from "@/features/comptable/theme";
import { useComptableWorkspace } from "@/features/comptable/hooks/useComptableWorkspace";

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(parsed);
}

export function ComptablePayrollPage() {
  const workspace = useComptableWorkspace();
  const [leaveForm, setLeaveForm] = useState({
    type: "paid_leave" as const,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const personalProfile = workspace.workspace.personalPayrollProfile;
  const personalAttendance = workspace.workspace.personalAttendanceSummary;
  const latestPayslip = workspace.personalLatestPayslip;

  return (
    <div className={comptableTheme.page}>
      <ComptableHero
        eyebrow="Paie & conges"
        title="Ma paie, mes conges et mes bulletins"
        description="Cette page est strictement personnelle. Le comptable y consulte uniquement sa propre paie, ses conges, ses retards, ses absences et ses heures supplementaires. Les bulletins des autres employes restent organises dans Finance."
        stats={[
          { label: "Mes bulletins", value: String(workspace.totals.personalPayslipCount) },
          { label: "Conges restants", value: String(workspace.workspace.leaveBalance.remainingDays) },
          { label: "Retards perso", value: String(personalAttendance.lateCount) },
          { label: "Heures supp.", value: `${personalAttendance.overtimeHours.toFixed(1)} h` },
        ]}
        sideContent={
          <Card className={`${comptableTheme.insetPanel} space-y-3 shadow-none`}>
            <p className={`text-sm font-semibold ${comptableTheme.primaryText}`}>Self-service employe</p>
            <p className={`text-sm ${comptableTheme.secondaryText}`}>
              La logique Ma paie & conges reste disponible pour tous les employes dans le module paie general. Ici, elle est specialisee pour le profil comptable sans exposer les bulletins des autres salaries.
            </p>
          </Card>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection
            eyebrow="Mon espace"
            title="Ma paie"
            description="Resume personnel, mode de paiement, banque et dernier cycle de paie visible."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={comptableTonePanel("neutral")}>
              <CreditCard className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Mode de paiement</p>
              <p className={`mt-1 text-lg font-semibold ${comptableTheme.primaryText}`}>{personalProfile.paymentMethodLabel}</p>
            </div>
            <div className={comptableTonePanel("info")}>
              <FileText className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Dernier bulletin</p>
              <p className={`mt-1 text-lg font-semibold ${comptableTheme.primaryText}`}>{latestPayslip?.periodLabel || "Aucun bulletin"}</p>
            </div>
            <div className={comptableTonePanel("success")}>
              <CalendarRange className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Banque de domiciliation</p>
              <p className={`mt-1 text-lg font-semibold ${comptableTheme.primaryText}`}>{personalProfile.bankLabel}</p>
            </div>
            <div className={comptableTonePanel("warning")}>
              <PlaneTakeoff className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Prochain paiement cible</p>
              <p className={`mt-1 text-lg font-semibold ${comptableTheme.primaryText}`}>{formatDate(personalProfile.nextPaymentDate)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className={comptableTonePanel("warning")}>
              <Clock3 className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Retards personnels</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{personalAttendance.lateCount}</p>
              <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>{personalAttendance.delayedMinutes} minutes cumulees</p>
            </div>
            <div className={comptableTonePanel("danger")}>
              <CalendarRange className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Absences</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{personalAttendance.absenceCount}</p>
              <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Suivi sur {personalAttendance.trackedMonth}</p>
            </div>
            <div className={comptableTonePanel("info")}>
              <TimerReset className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Heures supplementaires</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{personalAttendance.overtimeHours.toFixed(1)} h</p>
              <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>Rapprochees avec la paie personnelle</p>
            </div>
          </div>
        </Card>

        <Card className={`${comptableTheme.strongPanel} space-y-4`}>
          <ComptableSection
            eyebrow="Conges"
            title="Mes conges"
            description="Demande personnelle du comptable, dans la meme logique self-service que les autres employes."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={comptableTonePanel("success")}>
              <CalendarRange className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Restants</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.workspace.leaveBalance.remainingDays}</p>
            </div>
            <div className={comptableTonePanel("info")}>
              <PlaneTakeoff className="h-5 w-5 text-primary" />
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Approuves</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.workspace.leaveBalance.approvedDays}</p>
            </div>
            <div className={comptableTonePanel("warning")}>
              <Badge variant="warning">En attente</Badge>
              <p className={`mt-3 text-sm ${comptableTheme.subtleText}`}>Demandes</p>
              <p className={`mt-1 text-2xl font-semibold ${comptableTheme.primaryText}`}>{workspace.workspace.leaveBalance.pendingDays}</p>
            </div>
          </div>

          <form
            className={`${comptableTheme.insetPanel} space-y-3`}
            onSubmit={(event) => {
              event.preventDefault();
              workspace.actions.createLeaveRequest(leaveForm);
              setLeaveForm({
                type: "paid_leave",
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
                reason: "",
              });
            }}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className={comptableTheme.select}
                value={leaveForm.type}
                onChange={(event) => setLeaveForm((current) => ({ ...current, type: event.target.value as typeof leaveForm.type }))}
              >
                <option value="paid_leave">Conge paye</option>
                <option value="permission">Permission</option>
                <option value="sick_leave">Arret maladie</option>
              </select>
              <Input type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm((current) => ({ ...current, startDate: event.target.value }))} />
              <Input type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
            <Textarea rows={2} placeholder="Motif de la demande" value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} />
            <Button type="submit">Envoyer ma demande</Button>
          </form>

          <div className="grid gap-3">
            {workspace.workspace.leaveRequests.slice(0, 3).map((request) => (
              <div key={request.id} className={comptableTonePanel(request.status === "approved" ? "success" : request.status === "pending" ? "warning" : "neutral")}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`font-semibold ${comptableTheme.primaryText}`}>{request.type}</p>
                  <Badge variant={request.status === "approved" ? "success" : request.status === "pending" ? "warning" : "neutral"}>
                    {request.status}
                  </Badge>
                </div>
                <p className={`mt-2 text-sm ${comptableTheme.secondaryText}`}>
                  {formatDate(request.startDate)} au {formatDate(request.endDate)}
                </p>
                <p className={`mt-1 text-sm ${comptableTheme.secondaryText}`}>{request.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className={`${comptableTheme.strongPanel} space-y-4`}>
        <ComptableSection
          eyebrow="Bulletins personnels"
          title="Mes bulletins de paie"
          description="Tableau personnel avec telechargement direct. Cette zone ne montre jamais les bulletins des autres employes."
        />
        <PersonalPayslipTable
          payslips={workspace.workspace.personalPayslips}
          paymentMethodLabel={workspace.workspace.personalPayrollProfile.paymentMethodLabel}
        />
      </Card>
    </div>
  );
}
