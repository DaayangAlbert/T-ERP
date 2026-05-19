import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import {
  ApprovalStatus,
  ContractPhase,
  GuaranteeStatus,
  LegalCaseStatus,
  MarketContractStatus,
  MeetingStatus,
  MeetingType,
  RegisterStatus,
  ShareholderEntityType,
} from "@prisma/client";
import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

export const dynamic = "force-dynamic";

// Cycle de vie "en cours" (côté SG) : tout sauf CLOSED + CANCELLED
const ACTIVE_CONTRACT_PHASES = [
  ContractPhase.CONTRACT_SIGNATURE,
  ContractPhase.ORDER_SERVICE,
  ContractPhase.EXECUTION,
  ContractPhase.RECEPTION,
  ContractPhase.GUARANTEE_PERIOD,
];

const ACTIVE_LEGAL_STATUSES = [
  LegalCaseStatus.OPEN,
  LegalCaseStatus.MEDIATION,
  LegalCaseStatus.COURT_PENDING,
  LegalCaseStatus.APPEAL,
  LegalCaseStatus.SUPREME_COURT,
];

export async function GET() {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const now = new Date();
  const in30d = new Date(now.getTime() + 30 * 86400_000);
  const in60d = new Date(now.getTime() + 60 * 86400_000);

  const [
    user,
    tenant,
    activeContracts,
    contractsAmountAggregate,
    activeCases,
    casesProvisionsAggregate,
    nextMeeting,
    registers,
    expiringApprovals,
    expiringGuarantees,
    contractsAmendmentPending,
    boardMembers,
    shareholders,
    upcomingMeetings,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, taxId: true, cnpsId: true, slug: true },
    }),
    prisma.clientContract.count({
      where: { tenantId, status: MarketContractStatus.ACTIVE, phase: { in: ACTIVE_CONTRACT_PHASES } },
    }),
    prisma.clientContract.aggregate({
      where: { tenantId, status: MarketContractStatus.ACTIVE, phase: { in: ACTIVE_CONTRACT_PHASES } },
      _sum: { amountHT: true },
    }),
    prisma.legalCase.count({
      where: { tenantId, status: { in: ACTIVE_LEGAL_STATUSES } },
    }),
    prisma.legalCase.aggregate({
      where: { tenantId, status: { in: ACTIVE_LEGAL_STATUSES } },
      _sum: { provisionAmount: true },
    }),
    prisma.governanceMeeting.findFirst({
      where: { tenantId, status: MeetingStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, type: true, scheduledAt: true, location: true, status: true },
    }),
    prisma.regulatoryRegister.findMany({
      where: { tenantId },
      select: { id: true, registerType: true, name: true, status: true, nextReviewDate: true, entriesCount: true },
    }),
    prisma.professionalApproval.findMany({
      where: {
        tenantId,
        OR: [
          { status: { in: [ApprovalStatus.EXPIRING_SOON, ApprovalStatus.EXPIRED] } },
          { expiresAt: { lte: in60d } },
        ],
      },
      orderBy: { expiresAt: "asc" },
      select: { id: true, approvalName: true, deliveringAuthority: true, expiresAt: true, status: true },
    }),
    prisma.bankGuarantee.findMany({
      where: {
        contract: { tenantId },
        status: GuaranteeStatus.ACTIVE,
        expiryDate: { lte: in60d },
      },
      orderBy: { expiryDate: "asc" },
      select: {
        id: true,
        type: true,
        amount: true,
        issuingBank: true,
        expiryDate: true,
        contract: { select: { reference: true, title: true } },
      },
    }),
    prisma.clientContract.findMany({
      where: { tenantId, amendments: { some: { status: "DRAFT" } } },
      take: 5,
      select: {
        id: true,
        reference: true,
        title: true,
        contractingAuthority: true,
      },
    }),
    prisma.boardMember.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { function: "asc" },
      select: { id: true, fullName: true, function: true, isIndependent: true, representingEntity: true },
    }),
    prisma.shareholder.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { percentage: "desc" },
      select: { id: true, fullName: true, entityType: true, numberOfShares: true, totalShares: true, percentage: true },
    }),
    prisma.governanceMeeting.findMany({
      where: { tenantId, status: MeetingStatus.SCHEDULED, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      select: { id: true, type: true, scheduledAt: true, location: true },
    }),
  ]);

  const portfolioValue = Number(contractsAmountAggregate._sum.amountHT ?? 0n);
  const provisionsTotal = Number(casesProvisionsAggregate._sum.provisionAmount ?? 0n);

  const registersUpToDate = registers.every((r) => r.status === RegisterStatus.UP_TO_DATE);
  const registersToUpdate = registers.filter((r) => r.status !== RegisterStatus.UP_TO_DATE).length;

  const daysToNextMeeting = nextMeeting
    ? Math.max(0, Math.ceil((nextMeeting.scheduledAt.getTime() - now.getTime()) / 86_400_000))
    : null;

  // Alertes documentaires prioritaires (max 5, hiérarchisées)
  type Alert = SgDashboardResponse["alerts"][number];
  const alerts: Alert[] = [];

  for (const a of expiringApprovals.slice(0, 1)) {
    const daysLeft = Math.ceil((a.expiresAt.getTime() - now.getTime()) / 86_400_000);
    alerts.push({
      id: `approval-${a.id}`,
      severity: a.status === ApprovalStatus.EXPIRED || daysLeft < 0 ? "critical" : daysLeft <= 30 ? "warning" : "info",
      icon: "AlertOctagon",
      title: `Renouvellement ${a.approvalName}`,
      detail: `Délivrant ${a.deliveringAuthority} · expire ${daysLeft < 0 ? `il y a ${Math.abs(daysLeft)} j` : `dans ${daysLeft} j`}`,
      cta: { label: "Traiter", href: `/${tenant?.slug ?? ""}/secretaire-general/conformite#approval-${a.id}` },
    });
  }

  // Contentieux : prendre le plus proche d'audience
  const upcomingCase = await prisma.legalCase.findFirst({
    where: { tenantId, status: { in: ACTIVE_LEGAL_STATUSES }, nextHearingDate: { gte: now } },
    orderBy: { nextHearingDate: "asc" },
    select: { id: true, title: true, reference: true, nextHearingDate: true, amountAtStake: true, opposingParty: true },
  });
  if (upcomingCase) {
    const daysToHearing = Math.ceil((upcomingCase.nextHearingDate!.getTime() - now.getTime()) / 86_400_000);
    alerts.push({
      id: `case-${upcomingCase.id}`,
      severity: daysToHearing <= 14 ? "critical" : "warning",
      icon: "Gavel",
      title: `Contentieux ${upcomingCase.reference}`,
      detail: `${upcomingCase.title} · audience dans ${daysToHearing} j · ${(Number(upcomingCase.amountAtStake) / 1_000_000).toFixed(0)} M FCFA`,
      cta: { label: "Voir dossier", href: `/${session.tenantSlug ?? ""}/secretaire-general/contentieux#case-${upcomingCase.id}` },
    });
  }

  if (nextMeeting && daysToNextMeeting !== null && daysToNextMeeting <= 30) {
    alerts.push({
      id: `meeting-${nextMeeting.id}`,
      severity: daysToNextMeeting <= 7 ? "critical" : "warning",
      icon: "Landmark",
      title: `${nextMeeting.type === MeetingType.BOARD_MEETING ? "CA semestriel" : nextMeeting.type === MeetingType.ORDINARY_AG ? "AG ordinaire" : "AG extraordinaire"} dans ${daysToNextMeeting} j`,
      detail: `Préparer ordre du jour · ${nextMeeting.location}`,
      cta: { label: "Préparer OdJ", href: `/${session.tenantSlug ?? ""}/secretaire-general/gouvernance#meeting-${nextMeeting.id}` },
    });
  }

  for (const g of expiringGuarantees.slice(0, 1)) {
    const daysToExpiry = Math.ceil((g.expiryDate.getTime() - now.getTime()) / 86_400_000);
    alerts.push({
      id: `guarantee-${g.id}`,
      severity: daysToExpiry <= 30 ? "warning" : "info",
      icon: "Banknote",
      title: `Garantie ${g.contract.reference} à anticiper`,
      detail: `${g.issuingBank} · ${(Number(g.amount) / 1_000_000).toFixed(0)} M FCFA · échéance ${daysToExpiry} j`,
      cta: { label: "Voir contrat", href: `/${session.tenantSlug ?? ""}/secretaire-general/marches#contract-${g.contract.reference}` },
    });
  }

  if (registersToUpdate > 0) {
    alerts.push({
      id: "registers-todo",
      severity: "warning",
      icon: "Scale",
      title: `${registersToUpdate} registre${registersToUpdate > 1 ? "s" : ""} à mettre à jour`,
      detail: registers.filter((r) => r.status !== RegisterStatus.UP_TO_DATE).map((r) => r.name).join(", "),
      cta: { label: "Mettre à jour", href: `/${session.tenantSlug ?? ""}/secretaire-general/conformite` },
    });
  }

  // Limite à 5 alertes, tri par sévérité
  const severityRank: Record<Alert["severity"], number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const top5Alerts = alerts.slice(0, 5);

  // Capital structure
  const totalShares = shareholders[0]?.totalShares ?? 0;
  const capitalSocial = totalShares * 10_000; // 50 000 × 10 000 = 500 M FCFA

  const cac = boardMembers.find((m) => m.representingEntity?.toLowerCase().includes("kpmg"));

  const response: SgDashboardResponse = {
    greeting: {
      firstName: user?.firstName ?? "",
      tenantName: tenant?.name ?? "Société",
      activeContracts,
      activeCases,
      daysToNextMeeting,
      complianceAlertsCount: top5Alerts.length,
    },
    kpis: {
      activeContracts: { count: activeContracts, portfolioValue },
      nextMeeting: nextMeeting
        ? {
            type: nextMeeting.type,
            scheduledAt: nextMeeting.scheduledAt.toISOString(),
            daysToMeeting: daysToNextMeeting!,
          }
        : null,
      activeCases: { count: activeCases, provisionsTotal },
      compliance: { upToDate: registersUpToDate, toUpdateCount: registersToUpdate, alertsCount: top5Alerts.length },
    },
    alerts: top5Alerts,
    capitalStructure: {
      capitalSocial,
      totalShares,
      sharesNominal: 10_000,
      paidUpPercentage: 100,
      currency: "XAF",
      shareholders: shareholders.map((s) => ({
        id: s.id,
        name: s.fullName,
        entityType: s.entityType,
        numberOfShares: s.numberOfShares,
        percentage: s.percentage,
      })),
    },
    boardComposition: {
      totalCount: boardMembers.length,
      mandateYears: 3,
      cacName: cac ? "KPMG Cameroun" : null,
      cacMandateRange: cac ? "2024-2029" : null,
      members: boardMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        function: m.function,
        isIndependent: m.isIndependent,
        representingEntity: m.representingEntity,
      })),
    },
    officialCalendar: upcomingMeetings.map((m) => ({
      id: m.id,
      type: m.type,
      scheduledAt: m.scheduledAt.toISOString(),
      location: m.location,
      daysToMeeting: Math.ceil((m.scheduledAt.getTime() - now.getTime()) / 86_400_000),
    })),
  };

  return NextResponse.json(response);
}
