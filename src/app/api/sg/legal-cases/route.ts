import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import {
  LegalCaseStatus,
  LegalPosition,
  ContractingAuthorityType,
} from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const OPEN_STATUSES: LegalCaseStatus[] = [
  LegalCaseStatus.OPEN,
  LegalCaseStatus.MEDIATION,
  LegalCaseStatus.COURT_PENDING,
  LegalCaseStatus.APPEAL,
  LegalCaseStatus.SUPREME_COURT,
];
const CLOSED_STATUSES: LegalCaseStatus[] = [
  LegalCaseStatus.SETTLED,
  LegalCaseStatus.WON,
  LegalCaseStatus.LOST,
  LegalCaseStatus.ABANDONED,
];

function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function urgencyTone(daysToHearing: number | null, status: LegalCaseStatus): "rose" | "amber" | "violet" | "slate" {
  if (CLOSED_STATUSES.includes(status)) return "slate";
  if (daysToHearing !== null) {
    if (daysToHearing <= 7) return "rose";
    if (daysToHearing <= 30) return "amber";
  }
  if (status === LegalCaseStatus.COURT_PENDING || status === LegalCaseStatus.APPEAL) return "amber";
  return "violet";
}

export async function GET(req: Request) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const url = new URL(req.url);
  const filter = url.searchParams.get("status"); // OPEN | CLOSED | <enum>
  const jurisdiction = url.searchParams.get("jurisdiction");
  const q = url.searchParams.get("q")?.trim();

  const where: any = { tenantId };
  if (filter === "OPEN") where.status = { in: OPEN_STATUSES };
  else if (filter === "CLOSED") where.status = { in: CLOSED_STATUSES };
  else if (filter && filter in LegalCaseStatus) where.status = filter as LegalCaseStatus;
  if (jurisdiction) where.jurisdiction = { contains: jurisdiction, mode: "insensitive" };
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
      { opposingParty: { contains: q, mode: "insensitive" } },
      { lawyerName: { contains: q, mode: "insensitive" } },
    ];
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const [items, allForKpis, hearingsSoon] = await Promise.all([
    prisma.legalCase.findMany({
      where,
      orderBy: [{ nextHearingDate: "asc" }, { openedAt: "desc" }],
      select: {
        id: true,
        reference: true,
        title: true,
        ourPosition: true,
        jurisdiction: true,
        opposingParty: true,
        opposingPartyType: true,
        amountAtStake: true,
        provisionAmount: true,
        lawyerName: true,
        lawFirm: true,
        status: true,
        nextHearingDate: true,
        openedAt: true,
        closedAt: true,
        relatedContract: { select: { id: true, reference: true, title: true } },
      },
    }),
    prisma.legalCase.findMany({
      where: { tenantId },
      select: { status: true, provisionAmount: true, amountAtStake: true },
    }),
    prisma.legalCase.count({
      where: {
        tenantId,
        status: { in: OPEN_STATUSES },
        nextHearingDate: {
          gte: new Date(),
          lt: new Date(Date.now() + 30 * 86_400_000),
        },
      },
    }),
  ]);

  let provisionTotal = 0n;
  let amountAtStakeTotal = 0n;
  let activeCount = 0;
  let closedYtd = 0;
  let wonYtd = 0;
  for (const c of allForKpis) {
    if (OPEN_STATUSES.includes(c.status)) {
      activeCount++;
      provisionTotal += c.provisionAmount;
      amountAtStakeTotal += c.amountAtStake;
    }
  }
  // YTD closure stats (need closedAt)
  const closedThisYear = await prisma.legalCase.findMany({
    where: { tenantId, status: { in: CLOSED_STATUSES }, closedAt: { gte: yearStart } },
    select: { status: true },
  });
  closedYtd = closedThisYear.length;
  wonYtd = closedThisYear.filter((c) => c.status === LegalCaseStatus.WON || c.status === LegalCaseStatus.SETTLED).length;

  const enriched = items.map((c) => {
    const dToHearing = daysUntil(c.nextHearingDate);
    return {
      id: c.id,
      reference: c.reference,
      title: c.title,
      ourPosition: c.ourPosition,
      jurisdiction: c.jurisdiction,
      opposingParty: c.opposingParty,
      opposingPartyType: c.opposingPartyType,
      amountAtStake: Number(c.amountAtStake),
      provisionAmount: Number(c.provisionAmount),
      lawyerName: c.lawyerName,
      lawFirm: c.lawFirm,
      status: c.status,
      nextHearingDate: c.nextHearingDate?.toISOString() ?? null,
      daysToHearing: dToHearing,
      openedAt: c.openedAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
      relatedContract: c.relatedContract,
      urgencyTone: urgencyTone(dToHearing, c.status),
    };
  });

  return NextResponse.json({
    kpis: {
      activeCount,
      provisionTotal: Number(provisionTotal),
      amountAtStakeTotal: Number(amountAtStakeTotal),
      hearingsSoon,
      closedYtd,
      wonYtd,
    },
    items: enriched,
  });
}

const CreateLegalCaseSchema = z.object({
  reference: z.string().min(3).max(60),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  ourPosition: z.nativeEnum(LegalPosition),
  jurisdiction: z.string().min(2).max(120),
  caseNumber: z.string().max(120).optional().nullable(),
  opposingParty: z.string().min(2).max(200),
  opposingPartyType: z.nativeEnum(ContractingAuthorityType).optional().nullable(),
  amountAtStake: z.number().int().nonnegative(),
  provisionAmount: z.number().int().nonnegative(),
  lawyerName: z.string().min(2).max(120),
  lawFirm: z.string().min(2).max(120),
  strategy: z.string().max(2000).optional().nullable(),
  relatedContractId: z.string().optional().nullable(),
  nextHearingDate: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await guardSgMutation("canManageLegalCases");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = CreateLegalCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Provision > amountAtStake n'a pas de sens en IFRS
  if (data.provisionAmount > data.amountAtStake) {
    return NextResponse.json(
      { error: "Provision ne peut pas dépasser l'enjeu financier" },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.legalCase.create({
      data: {
        tenantId,
        reference: data.reference,
        title: data.title,
        description: data.description,
        ourPosition: data.ourPosition,
        jurisdiction: data.jurisdiction,
        caseNumber: data.caseNumber ?? null,
        opposingParty: data.opposingParty,
        opposingPartyType: data.opposingPartyType ?? null,
        amountAtStake: BigInt(data.amountAtStake),
        provisionAmount: BigInt(data.provisionAmount),
        lawyerName: data.lawyerName,
        lawFirm: data.lawFirm,
        strategy: data.strategy ?? null,
        relatedContractId: data.relatedContractId ?? null,
        nextHearingDate: data.nextHearingDate ? new Date(data.nextHearingDate) : null,
        status: LegalCaseStatus.OPEN,
      },
      select: { id: true },
    });
    await tx.legalCaseEvent.create({
      data: {
        caseId: c.id,
        eventType: "OPENING",
        eventDate: new Date(),
        description: `Ouverture du dossier · provision initiale ${data.provisionAmount.toLocaleString("fr-FR")} FCFA · stratégie : ${data.strategy ?? "à définir"}`,
      },
    });
    return c;
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
