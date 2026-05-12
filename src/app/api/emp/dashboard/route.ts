import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Tableau de bord personnel — agrégat unique pour /emp/dashboard.
 * Renvoie les KPIs, le dernier bulletin (pour la CTA paie), le chantier
 * d'affectation principal et, pour les chefs d'équipe, la liste de leur
 * équipe avec présences du jour.
 */
export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      professionalCategory: true,
      teamLeader: true,
      preferredLanguage: true,
      hireDate: true,
      assignedSiteIds: true,
    },
  });
  if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const seniorityYears = me.hireDate
    ? Math.floor((Date.now() - me.hireDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  // Dernier bulletin (toutes périodes, prend le plus récent)
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
      paymentBankAccount: true,
      status: true,
      overtimeHours: true,
    },
  });

  // Solde de congés payés (année en cours)
  const currentYear = new Date().getFullYear();
  const leaveBalance = await prisma.leaveBalance.findFirst({
    where: { userId: me.id, year: currentYear },
    select: { paidLeaveRemaining: true, compensatoryDays: true },
  });

  // Heures sup affichées en KPI = celles du dernier bulletin émis (mois N-1
  // typiquement). Plus parlant pour l'ouvrier que le total partiel du mois
  // en cours, et aligné sur le brut visible sur la fiche paie.
  const lastPayslipOvertimeHours = latestPayslip?.overtimeHours ?? 0;

  // Chantier principal d'affectation
  const primarySiteId = me.assignedSiteIds[0];
  let site: {
    id: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    progress: number;
    startDate: Date;
    plannedEndDate: Date;
    managerName: string | null;
    siteManagerName: string | null;
    workforceCount: number;
    presentCount: number;
  } | null = null;

  if (primarySiteId) {
    const s = await prisma.site.findUnique({
      where: { id: primarySiteId },
      select: {
        id: true,
        code: true,
        name: true,
        client: true,
        region: true,
        progress: true,
        startDate: true,
        plannedEndDate: true,
        manager: { select: { firstName: true, lastName: true } },
      },
    });
    if (s) {
      // Chef de Chantier (CC) : utilisateur SITE_MANAGER assigné à ce chantier
      const cc = await prisma.user.findFirst({
        where: { role: Role.SITE_MANAGER, assignedSiteIds: { has: s.id } },
        select: { firstName: true, lastName: true },
      });
      const workforceCount = await prisma.user.count({
        where: {
          assignedSiteIds: { has: s.id },
          role: { in: [Role.WORKER, Role.EMPLOYEE] },
        },
      });
      // Présents aujourd'hui : TimeReport.status = PRESENT sur la date du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const presentCount = await prisma.timeReport.count({
        where: { siteId: s.id, date: today, status: "PRESENT" },
      });
      site = {
        id: s.id,
        code: s.code,
        name: s.name,
        client: s.client,
        region: s.region,
        progress: s.progress,
        startDate: s.startDate,
        plannedEndDate: s.plannedEndDate,
        managerName: s.manager ? `${s.manager.firstName} ${s.manager.lastName}` : null,
        siteManagerName: cc ? `${cc.firstName} ${cc.lastName}` : null,
        workforceCount,
        presentCount,
      };
    }
  }

  // Mon équipe — uniquement si l'utilisateur est chef d'équipe
  let team: {
    specialty: string;
    totalCount: number;
    presentCount: number;
    members: Array<{
      id: string;
      firstName: string;
      lastName: string;
      position: string | null;
      presentToday: boolean;
      arrivalTime: Date | null;
      absentReason: string | null;
    }>;
  } | null = null;

  if (me.teamLeader && primarySiteId) {
    // Match heuristique par mot-clé sur la position (Coffrage / Coffreur,
    // Ferraillage / Ferrailleur, Maçonnerie / Maçon, …). À défaut on prend
    // tous les ouvriers du chantier.
    const specialtyKey = (me.position ?? "")
      .toLowerCase()
      .replace(/^chef d'équipe\s+/i, "")
      .trim();
    const matchTerm = specialtyKey
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/\s+/)[0]; // ex: "coffrage" -> "coffrage"
    const fallbackTerm = matchTerm.replace(/age$/, ""); // "coffrage" -> "coffr"

    const candidates = await prisma.user.findMany({
      where: {
        id: { not: me.id },
        assignedSiteIds: { has: primarySiteId },
        role: { in: [Role.WORKER, Role.EMPLOYEE] },
        ...(matchTerm
          ? {
              OR: [
                { position: { contains: matchTerm, mode: "insensitive" } },
                { position: { contains: fallbackTerm, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ firstName: "asc" }],
      take: 14,
      select: { id: true, firstName: true, lastName: true, position: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReports = await prisma.timeReport.findMany({
      where: {
        userId: { in: candidates.map((c) => c.id) },
        date: today,
      },
      select: { userId: true, status: true, arrivalTime: true, contestReason: true },
    });
    const presenceByUser = new Map(todayReports.map((r) => [r.userId, r]));

    const members = candidates.map((c) => {
      const r = presenceByUser.get(c.id);
      const isPresent = r?.status === "PRESENT";
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        position: c.position,
        presentToday: isPresent,
        arrivalTime: isPresent ? (r?.arrivalTime ?? null) : null,
        absentReason: !isPresent && r ? (r.contestReason ?? r.status) : null,
      };
    });

    team = {
      specialty: specialtyKey || "Équipe",
      totalCount: members.length,
      presentCount: members.filter((m) => m.presentToday).length,
      members,
    };
  }

  return NextResponse.json({
    user: {
      id: me.id,
      firstName: me.firstName,
      lastName: me.lastName,
      position: me.position,
      professionalCategory: me.professionalCategory,
      teamLeader: me.teamLeader,
      preferredLanguage: me.preferredLanguage,
      seniorityYears,
    },
    kpis: {
      lastNetSalary: latestPayslip?.netAmount ? Number(latestPayslip.netAmount) : 0,
      lastPeriodLabel: latestPayslip?.periodLabel ?? null,
      leavesRemaining: leaveBalance?.paidLeaveRemaining ?? 0,
      compensatoryDays: leaveBalance?.compensatoryDays ?? 0,
      overtimeHoursMonth: lastPayslipOvertimeHours,
      seniorityYears,
    },
    latestPayslip: latestPayslip
      ? {
          id: latestPayslip.id,
          period: latestPayslip.period,
          periodLabel: latestPayslip.periodLabel,
          netAmount: Number(latestPayslip.netAmount),
          paymentDate: latestPayslip.paymentDate,
          paymentReference: latestPayslip.paymentReference,
          paymentBankAccount: latestPayslip.paymentBankAccount,
          status: latestPayslip.status,
        }
      : null,
    site,
    team,
  });
}
