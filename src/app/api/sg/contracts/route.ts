import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import {
  ContractPhase,
  ContractingAuthorityType,
  GuaranteeStatus,
  MarketContractStatus,
} from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ACTIVE_PHASES = [
  ContractPhase.CONTRACT_SIGNATURE,
  ContractPhase.ORDER_SERVICE,
  ContractPhase.EXECUTION,
  ContractPhase.RECEPTION,
  ContractPhase.GUARANTEE_PERIOD,
];
const SUBMISSION_PHASES = [
  ContractPhase.CALL_FOR_TENDERS_WATCH,
  ContractPhase.STUDY_AND_SUBMISSION,
  ContractPhase.AWAITING_ATTRIBUTION,
];

export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const phase = url.searchParams.get("phase") as ContractPhase | "ACTIVE" | "SUBMISSION" | "CLOSED" | null;
  const moaType = url.searchParams.get("moaType") as ContractingAuthorityType | null;
  const minAmount = url.searchParams.get("minAmount");
  const year = url.searchParams.get("year");

  const where: any = { tenantId };
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { contractingAuthority: { contains: q, mode: "insensitive" } },
    ];
  }
  if (phase === "ACTIVE") where.phase = { in: ACTIVE_PHASES };
  else if (phase === "SUBMISSION") where.phase = { in: SUBMISSION_PHASES };
  else if (phase === "CLOSED") where.phase = ContractPhase.CLOSED;
  else if (phase) where.phase = phase;
  if (moaType) where.authorityType = moaType;
  if (minAmount) where.amountHT = { gte: BigInt(minAmount) };
  if (year) {
    const y = Number(year);
    where.signatureDate = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [
    items,
    countActive,
    countSubmission,
    countClosed,
    portfolioAggregate,
    guaranteesAggregate,
    attemptsYtd,
    awardedYtd,
  ] = await Promise.all([
    prisma.clientContract.findMany({
      where,
      orderBy: [{ status: "asc" }, { phase: "asc" }, { reference: "desc" }],
      select: {
        id: true,
        reference: true,
        title: true,
        contractingAuthority: true,
        authorityType: true,
        amountHT: true,
        currency: true,
        phase: true,
        status: true,
        legalStatus: true,
        signatureDate: true,
        callForTendersCloseDate: true,
        executionStartDate: true,
        gpaEndDate: true,
        siteId: true,
        site: { select: { code: true, name: true } },
        bankGuarantees: {
          where: { status: GuaranteeStatus.ACTIVE },
          select: { id: true, type: true, amount: true, issuingBank: true, expiryDate: true },
        },
      },
      take: 100,
    }),
    prisma.clientContract.count({ where: { tenantId, phase: { in: ACTIVE_PHASES } } }),
    prisma.clientContract.count({ where: { tenantId, phase: { in: SUBMISSION_PHASES } } }),
    prisma.clientContract.count({ where: { tenantId, phase: ContractPhase.CLOSED } }),
    prisma.clientContract.aggregate({
      where: { tenantId, phase: { in: ACTIVE_PHASES } },
      _sum: { amountHT: true },
    }),
    prisma.bankGuarantee.aggregate({
      where: { contract: { tenantId }, status: GuaranteeStatus.ACTIVE },
      _sum: { amount: true },
    }),
    prisma.clientContract.count({
      where: { tenantId, submissionDate: { gte: yearStart } },
    }),
    prisma.clientContract.count({
      where: {
        tenantId,
        submissionDate: { gte: yearStart },
        phase: { in: [...ACTIVE_PHASES, ContractPhase.CLOSED] },
      },
    }),
  ]);

  const successRateYtd = attemptsYtd > 0 ? Math.round((awardedYtd / attemptsYtd) * 100) : 0;
  const portfolioValue = Number(portfolioAggregate._sum.amountHT ?? 0n);
  const guaranteesTotal = Number(guaranteesAggregate._sum.amount ?? 0n);

  // AO en cours (cards séparées du tableau)
  const callsForTenders = items
    .filter((c) => c.phase === ContractPhase.STUDY_AND_SUBMISSION || c.phase === ContractPhase.CALL_FOR_TENDERS_WATCH || c.phase === ContractPhase.AWAITING_ATTRIBUTION)
    .slice(0, 6)
    .map((c) => {
      const daysToClose = c.callForTendersCloseDate
        ? Math.ceil((c.callForTendersCloseDate.getTime() - Date.now()) / 86_400_000)
        : null;
      return {
        id: c.id,
        reference: c.reference,
        title: c.title,
        contractingAuthority: c.contractingAuthority,
        amountHT: Number(c.amountHT),
        phase: c.phase,
        callForTendersCloseDate: c.callForTendersCloseDate?.toISOString() ?? null,
        daysToClose,
      };
    });

  return NextResponse.json({
    counts: {
      total: items.length,
      active: countActive,
      submission: countSubmission,
      closed: countClosed,
    },
    kpis: {
      activeContracts: countActive,
      portfolioValue,
      openCallsForTenders: countSubmission,
      successRateYtd,
      successRateAttempts: attemptsYtd,
      guaranteesTotal,
    },
    items: items.map((c) => ({
      id: c.id,
      reference: c.reference,
      title: c.title,
      contractingAuthority: c.contractingAuthority,
      authorityType: c.authorityType,
      amountHT: Number(c.amountHT),
      currency: c.currency,
      phase: c.phase,
      status: c.status,
      legalStatus: c.legalStatus,
      signatureDate: c.signatureDate?.toISOString() ?? null,
      executionStartDate: c.executionStartDate?.toISOString() ?? null,
      gpaEndDate: c.gpaEndDate?.toISOString() ?? null,
      siteName: c.site?.name ?? null,
      siteCode: c.site?.code ?? null,
      guaranteesActive: c.bankGuarantees.length,
      guaranteesTotal: c.bankGuarantees.reduce((s, g) => s + Number(g.amount), 0),
      guaranteesBanks: Array.from(new Set(c.bankGuarantees.map((g) => g.issuingBank))).slice(0, 2),
    })),
    callsForTenders,
  });
}

const createSchema = z.object({
  reference: z.string().min(2).max(60),
  title: z.string().min(3).max(200),
  contractingAuthority: z.string().min(2).max(200),
  authorityType: z.nativeEnum(ContractingAuthorityType),
  amountHT: z.number().int().nonnegative(),
  phase: z.nativeEnum(ContractPhase).default(ContractPhase.CALL_FOR_TENDERS_WATCH),
  callForTendersCloseDate: z.string().datetime().optional(),
  submissionDate: z.string().datetime().optional(),
  siteId: z.string().cuid().nullable().optional(),
});

export async function POST(req: Request) {
  const guard = await guardSgMutation("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const created = await prisma.clientContract.create({
      data: {
        tenantId,
        reference: data.reference,
        title: data.title,
        contractingAuthority: data.contractingAuthority,
        authorityType: data.authorityType,
        amountHT: BigInt(data.amountHT),
        phase: data.phase,
        status: MarketContractStatus.DRAFT,
        callForTendersCloseDate: data.callForTendersCloseDate ? new Date(data.callForTendersCloseDate) : null,
        submissionDate: data.submissionDate ? new Date(data.submissionDate) : null,
        siteId: data.siteId ?? null,
        createdBy: session.sub,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Référence déjà utilisée" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
