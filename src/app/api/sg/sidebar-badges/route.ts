import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import {
  ContractPhase,
  CorrespondenceStatus,
  LegalCaseStatus,
  MarketContractStatus,
  MeetingStatus,
} from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Compteurs légers consommés par `useSidebarBadges` pour mettre à jour
 * dynamiquement les badges de la sidebar SG.
 *
 * Renvoyé : nombre de marchés actifs, jours jusqu'à la prochaine réunion CA,
 * contentieux actifs, courriers en attente.
 */
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

  const [activeContracts, nextMeeting, activeCases, awaitingDg, incomingDrafts] = await Promise.all([
    prisma.clientContract.count({
      where: { tenantId, status: MarketContractStatus.ACTIVE, phase: { in: ACTIVE_CONTRACT_PHASES } },
    }),
    prisma.governanceMeeting.findFirst({
      where: { tenantId, status: MeetingStatus.SCHEDULED, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    }),
    prisma.legalCase.count({
      where: { tenantId, status: { in: ACTIVE_LEGAL_STATUSES } },
    }),
    prisma.officialCorrespondence.count({
      where: { tenantId, status: CorrespondenceStatus.AWAITING_DG_SIGNATURE },
    }),
    prisma.officialCorrespondence.count({
      where: { tenantId, status: CorrespondenceStatus.RECEIVED, handledAt: null },
    }),
  ]);

  const daysToNextMeeting = nextMeeting
    ? Math.max(0, Math.ceil((nextMeeting.scheduledAt.getTime() - now.getTime()) / 86_400_000))
    : null;

  return NextResponse.json({
    activeContracts,
    daysToNextMeeting,
    activeCases,
    correspondencesPending: awaitingDg + incomingDrafts,
  });
}
