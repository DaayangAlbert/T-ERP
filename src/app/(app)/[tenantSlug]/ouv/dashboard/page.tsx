"use client";

import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import { OuvHeader } from "@/components/ouv/dashboard/OuvHeader";
import { OuvIdentityBanner } from "@/components/ouv/dashboard/OuvIdentityBanner";
import { OuvPointageCard } from "@/components/ouv/dashboard/OuvPointageCard";
import { OuvKpiMini } from "@/components/ouv/dashboard/OuvKpiMini";
import { OuvBulletinCard } from "@/components/ouv/dashboard/OuvBulletinCard";
import { OuvQuickActions } from "@/components/ouv/dashboard/OuvQuickActions";
import { OuvWhatsAppButton } from "@/components/ouv/dashboard/OuvWhatsAppButton";

// Reproduction pixel-perfect du prototype screen-ouv-dashboard (fn 1.1).
// Mobile-first 414px. Empilage vertical :
//   1. Header sombre (logo + avatar 36px)
//   2. Bandeau identité gradient violet (avatar 54px + chip affectation)
//   3. .page background #FAFAF7 :
//      - Card pointage avec bouton HÉROS vert (68px)
//      - 2 mini-KPIs (salaire + congés)
//      - Card "Nouveau bulletin disponible" (si récent)
//      - 5 cards actions rapides (Paie · Congés · Missions · HSE · Équipe)
//      - Bouton WhatsApp vert (contact chef chantier)

export default function OuvDashboardPage() {
  const { data, isLoading, error } = useOuvDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError />;

  const { user, assignment, todayClock, latestPayslip, kpis } = data;
  const chiefFullName = assignment?.chief
    ? `${assignment.chief.firstName} ${assignment.chief.lastName}`
    : null;

  return (
    <>
      <OuvHeader initials={user.initials} avatarUrl={user.avatarUrl} />

      <OuvIdentityBanner
        initials={user.initials}
        fullName={`${user.firstName} ${user.lastName}`}
        qualification={user.workerQualification}
        matricule={user.matricule}
        avatarUrl={user.avatarUrl}
        assignment={
          assignment
            ? {
                siteCode: assignment.siteCode,
                siteName: assignment.siteName,
                teamLabel: assignment.teamLabel,
                payrollDayLabel: assignment.payrollDayLabel,
                chief: assignment.chief
                  ? {
                      firstName: assignment.chief.firstName,
                      lastName: assignment.chief.lastName,
                    }
                  : null,
              }
            : null
        }
      />

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        <OuvPointageCard
          state={todayClock.state}
          arrivalTime={todayClock.arrivalTime}
          departureTime={todayClock.departureTime}
          totalHours={todayClock.totalHours}
        />

        <OuvKpiMini
          lastNetSalary={latestPayslip?.netAmount ?? 0}
          lastPaymentDate={latestPayslip?.paymentDate ?? null}
          leavesRemaining={kpis.leavesRemaining}
        />

        {latestPayslip && (
          <OuvBulletinCard
            payslipId={latestPayslip.id}
            periodLabel={latestPayslip.periodLabel ?? ""}
            netAmount={latestPayslip.netAmount}
            isNew={latestPayslip.isNew}
          />
        )}

        <OuvQuickActions
          leavesRemaining={kpis.leavesRemaining}
          newMissionsCount={kpis.newMissionsCount}
          teamCount={kpis.teamCount}
          chiefFullName={chiefFullName}
        />

        {assignment?.chief?.whatsappUrl && chiefFullName && (
          <OuvWhatsAppButton chiefFullName={chiefFullName} whatsappUrl={assignment.chief.whatsappUrl} />
        )}
      </main>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-12 animate-pulse bg-[#2A1B3D]" />
      <div className="h-[120px] animate-pulse bg-gradient-to-br from-[#2A1B3D] to-[#7E22CE]" />
      <main className="page mx-auto w-full max-w-screen-md space-y-3.5 px-3 pt-3.5">
        <div className="h-[180px] animate-pulse rounded-2xl bg-white" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-[88px] animate-pulse rounded-xl bg-white" />
          <div className="h-[88px] animate-pulse rounded-xl bg-white" />
        </div>
        <div className="h-[80px] animate-pulse rounded-2xl bg-purple-50" />
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      </main>
    </>
  );
}

function DashboardError() {
  return (
    <main className="page mx-auto w-full max-w-screen-md px-3 pt-8 text-center">
      <p className="text-base font-semibold text-rose-700">
        Impossible de charger votre tableau de bord.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Vérifie ta connexion 3G/4G puis réessaie.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex h-12 items-center justify-center rounded-lg bg-purple-600 px-6 text-sm font-semibold text-white"
      >
        Réessayer
      </button>
    </main>
  );
}
