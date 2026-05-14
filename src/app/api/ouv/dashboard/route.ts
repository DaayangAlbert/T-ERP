import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { Role, MissionStatus } from "@prisma/client";
import { normalizeCmPhone } from "@/lib/ouv/phone";

export const dynamic = "force-dynamic";

// GET /api/ouv/dashboard
//
// Agrégat unique consommé par /ouv/dashboard (mirror screen-ouv-dashboard).
// Une seule requête réseau pour limiter le data crédit ouvrier (3G/4G).
// Réponse jouable hors-ligne via le cache du service worker sw-ouv.js.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      matricule: true,
      position: true,
      workerQualification: true,
      professionalCategory: true,
      teamLeader: true,
      isGuard: true,
      hireDate: true,
      assignedSiteIds: true,
      preferredLanguage: true,
    },
  });
  if (!me) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const initials = `${me.firstName.charAt(0)}${me.lastName.charAt(0)}`.toUpperCase();
  const seniorityYears = me.hireDate
    ? Math.floor((Date.now() - me.hireDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  // -----------------------------------------------------------------
  // Affectation chantier + Chef Chantier (pour bouton WhatsApp)
  // -----------------------------------------------------------------
  const primarySiteId = me.assignedSiteIds[0] ?? null;
  let assignment: {
    siteId: string;
    siteCode: string;
    siteName: string;
    teamLabel: string;
    payrollDayLabel: string;
    chief: {
      id: string;
      firstName: string;
      lastName: string;
      phoneE164: string | null;
      whatsappUrl: string | null;
    } | null;
  } | null = null;

  if (primarySiteId) {
    const site = await prisma.site.findUnique({
      where: { id: primarySiteId },
      select: { id: true, code: true, name: true },
    });
    if (site) {
      const chief = await prisma.user.findFirst({
        where: { role: Role.SITE_MANAGER, assignedSiteIds: { has: site.id } },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
      const chiefPhoneE164 = chief?.phone ? normalizeCmPhone(chief.phone) : null;
      assignment = {
        siteId: site.id,
        siteCode: site.code,
        siteName: site.name,
        teamLabel: me.teamLeader ? "équipe (chef d'équipe)" : "équipe coffrage",
        // Jour X/30 du cycle de paie courant (approximé sur le mois calendaire)
        payrollDayLabel: `jour ${new Date().getDate()}/30 paie`,
        chief: chief
          ? {
              id: chief.id,
              firstName: chief.firstName,
              lastName: chief.lastName,
              phoneE164: chiefPhoneE164,
              whatsappUrl: chiefPhoneE164
                ? `https://wa.me/${chiefPhoneE164.replace("+", "")}`
                : null,
            }
          : null,
      };
    }
  }

  // -----------------------------------------------------------------
  // Pointage du jour (NOT_CLOCKED / IN_PROGRESS / DONE)
  // -----------------------------------------------------------------
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayReport = await prisma.timeReport.findUnique({
    where: { userId_date: { userId: me.id, date: today } },
    select: {
      id: true,
      arrivalTime: true,
      departureTime: true,
      totalHours: true,
      overtimeHours: true,
      status: true,
    },
  });

  const clockState: "NOT_CLOCKED" | "IN_PROGRESS" | "DONE" = !todayReport
    ? "NOT_CLOCKED"
    : todayReport.departureTime
      ? "DONE"
      : "IN_PROGRESS";

  // -----------------------------------------------------------------
  // Dernier bulletin (pour la card "Nouveau bulletin disponible")
  // -----------------------------------------------------------------
  const latestPayslip = await prisma.payslip.findFirst({
    where: { userId: me.id },
    orderBy: { period: "desc" },
    select: {
      id: true,
      period: true,
      periodLabel: true,
      netAmount: true,
      paymentDate: true,
      paymentReference: true,
      status: true,
    },
  });

  const payslipIsNew = latestPayslip?.paymentDate
    ? Date.now() - latestPayslip.paymentDate.getTime() < 14 * 24 * 3600 * 1000
    : false;

  // -----------------------------------------------------------------
  // Solde congés (année en cours)
  // -----------------------------------------------------------------
  const currentYear = new Date().getFullYear();
  const leaveBalance = await prisma.leaveBalance.findFirst({
    where: { userId: me.id, year: currentYear },
    select: { paidLeaveRemaining: true, compensatoryDays: true },
  });

  // -----------------------------------------------------------------
  // Compteurs missions / équipe pour les badges actions rapides
  // -----------------------------------------------------------------
  const newMissionsCount = await prisma.missionAssignment.count({
    where: {
      userId: me.id,
      status: MissionStatus.PENDING_ACCEPTANCE,
    },
  });

  const teamCount = primarySiteId
    ? await prisma.user.count({
        where: {
          assignedSiteIds: { has: primarySiteId },
          role: Role.WORKER,
        },
      })
    : 0;

  return NextResponse.json({
    user: {
      id: me.id,
      firstName: me.firstName,
      lastName: me.lastName,
      initials,
      avatarUrl: me.avatarUrl,
      matricule: me.matricule,
      // Qualif courte affichée en bandeau ; fallback sur position si absente
      workerQualification: me.workerQualification ?? me.position ?? "Ouvrier",
      position: me.position,
      professionalCategory: me.professionalCategory,
      teamLeader: me.teamLeader,
      isGuard: me.isGuard,
      seniorityYears,
    },
    assignment,
    todayClock: todayReport
      ? {
          state: clockState,
          arrivalTime: todayReport.arrivalTime,
          departureTime: todayReport.departureTime,
          totalHours: todayReport.totalHours,
          overtimeHours: todayReport.overtimeHours,
        }
      : { state: clockState, arrivalTime: null, departureTime: null, totalHours: 0, overtimeHours: 0 },
    latestPayslip: latestPayslip
      ? {
          id: latestPayslip.id,
          period: latestPayslip.period,
          periodLabel: latestPayslip.periodLabel,
          netAmount: Number(latestPayslip.netAmount),
          paymentDate: latestPayslip.paymentDate,
          paymentReference: latestPayslip.paymentReference,
          status: latestPayslip.status,
          isNew: payslipIsNew,
        }
      : null,
    kpis: {
      leavesRemaining: leaveBalance?.paidLeaveRemaining ?? 0,
      compensatoryDays: leaveBalance?.compensatoryDays ?? 0,
      newMissionsCount,
      teamCount,
    },
  });
}
