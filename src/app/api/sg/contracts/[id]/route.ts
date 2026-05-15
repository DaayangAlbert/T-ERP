import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg, guardSgMutation } from "@/lib/rbac/sg-guard";
import { ContractPhase, ContractingAuthorityType, LegalContractStatus, MarketContractStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.clientContract.findFirst({
    where: { id: params.id, tenantId },
    include: {
      site: { select: { id: true, code: true, name: true, status: true, manager: { select: { firstName: true, lastName: true } } } },
      amendments: { orderBy: { amendmentNumber: "asc" } },
      bankGuarantees: { orderBy: { issuedAt: "asc" } },
      legalCases: { select: { id: true, reference: true, title: true, status: true, amountAtStake: true } },
    },
  });

  if (!c) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

  return NextResponse.json({
    id: c.id,
    reference: c.reference,
    title: c.title,
    contractingAuthority: c.contractingAuthority,
    authorityType: c.authorityType,
    amountHT: Number(c.amountHT),
    currency: c.currency,
    vatRate: c.vatRate,
    phase: c.phase,
    status: c.status,
    legalStatus: c.legalStatus,
    callForTendersOpenDate: c.callForTendersOpenDate?.toISOString() ?? null,
    callForTendersCloseDate: c.callForTendersCloseDate?.toISOString() ?? null,
    submissionDate: c.submissionDate?.toISOString() ?? null,
    notificationDate: c.notificationDate?.toISOString() ?? null,
    signatureDate: c.signatureDate?.toISOString() ?? null,
    orderServiceDate: c.orderServiceDate?.toISOString() ?? null,
    executionStartDate: c.executionStartDate?.toISOString() ?? null,
    receptionPV: c.receptionPV?.toISOString() ?? null,
    gpaEndDate: c.gpaEndDate?.toISOString() ?? null,
    site: c.site
      ? {
          id: c.site.id,
          code: c.site.code,
          name: c.site.name,
          status: c.site.status,
          manager: c.site.manager ? `${c.site.manager.firstName} ${c.site.manager.lastName}` : null,
        }
      : null,
    amendments: c.amendments.map((a) => ({
      id: a.id,
      amendmentNumber: a.amendmentNumber,
      reason: a.reason,
      additionalAmount: Number(a.additionalAmount),
      additionalDelayDays: a.additionalDelayDays,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      signedAt: a.signedAt?.toISOString() ?? null,
      status: a.status,
    })),
    bankGuarantees: c.bankGuarantees.map((g) => ({
      id: g.id,
      type: g.type,
      amount: Number(g.amount),
      issuingBank: g.issuingBank,
      issuedAt: g.issuedAt.toISOString(),
      expiryDate: g.expiryDate.toISOString(),
      releaseDate: g.releaseDate?.toISOString() ?? null,
      status: g.status,
    })),
    legalCases: c.legalCases.map((l) => ({
      id: l.id,
      reference: l.reference,
      title: l.title,
      status: l.status,
      amountAtStake: Number(l.amountAtStake),
    })),
  });
}

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  contractingAuthority: z.string().min(2).max(200).optional(),
  authorityType: z.nativeEnum(ContractingAuthorityType).optional(),
  amountHT: z.number().int().nonnegative().optional(),
  legalStatus: z.nativeEnum(LegalContractStatus).optional(),
  status: z.nativeEnum(MarketContractStatus).optional(),
  callForTendersOpenDate: z.string().datetime().nullable().optional(),
  callForTendersCloseDate: z.string().datetime().nullable().optional(),
  submissionDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const existing = await prisma.clientContract.findFirst({ where: { id: params.id, tenantId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    await prisma.clientContract.update({
      where: { id: params.id },
      data: {
        title: data.title,
        contractingAuthority: data.contractingAuthority,
        authorityType: data.authorityType,
        amountHT: data.amountHT !== undefined ? BigInt(data.amountHT) : undefined,
        legalStatus: data.legalStatus,
        status: data.status,
        callForTendersOpenDate: data.callForTendersOpenDate ? new Date(data.callForTendersOpenDate) : data.callForTendersOpenDate === null ? null : undefined,
        callForTendersCloseDate: data.callForTendersCloseDate ? new Date(data.callForTendersCloseDate) : data.callForTendersCloseDate === null ? null : undefined,
        submissionDate: data.submissionDate ? new Date(data.submissionDate) : data.submissionDate === null ? null : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
