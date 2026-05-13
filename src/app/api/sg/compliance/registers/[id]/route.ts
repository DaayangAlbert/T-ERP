import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { RegisterStatus, RegisterType } from "@prisma/client";

export const dynamic = "force-dynamic";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const guard = await guardSg();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const r = await prisma.regulatoryRegister.findFirst({
    where: { id: params.id, tenantId },
    include: {
      responsibleUser: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });
  if (!r) {
    return NextResponse.json({ error: "Registre introuvable" }, { status: 404 });
  }

  // Sources d'entrées récentes selon le type
  let recentEntries: Array<{ date: string; label: string; ref?: string }> = [];
  if (r.registerType === RegisterType.BOARD_DECISIONS || r.registerType === RegisterType.AG_DECISIONS) {
    const meetingTypes =
      r.registerType === RegisterType.BOARD_DECISIONS
        ? ["BOARD_MEETING"]
        : ["ORDINARY_AG", "EXTRAORDINARY_AG"];
    const decisions = await prisma.meetingDecision.findMany({
      where: {
        meeting: { tenantId, type: { in: meetingTypes as any } },
      },
      orderBy: { decidedAt: "desc" },
      take: 10,
      select: {
        decisionNumber: true,
        title: true,
        decidedAt: true,
        meeting: { select: { type: true } },
      },
    });
    recentEntries = decisions.map((d) => ({
      date: d.decidedAt.toISOString(),
      label: d.title,
      ref: `#${d.decisionNumber}`,
    }));
  } else if (r.registerType === RegisterType.BANK_GUARANTEES) {
    const gtees = await prisma.bankGuarantee.findMany({
      where: { contract: { tenantId } },
      orderBy: { issuedAt: "desc" },
      take: 10,
      select: { type: true, amount: true, issuedAt: true, issuingBank: true, contract: { select: { reference: true } } },
    });
    recentEntries = gtees.map((g) => ({
      date: g.issuedAt.toISOString(),
      label: `${g.type} · ${Number(g.amount).toLocaleString("fr-FR")} F · ${g.issuingBank}`,
      ref: g.contract?.reference,
    }));
  } else if (r.registerType === RegisterType.PUBLIC_MARKETS) {
    const contracts = await prisma.clientContract.findMany({
      where: { tenantId, signatureDate: { not: null } },
      orderBy: { signatureDate: "desc" },
      take: 10,
      select: { reference: true, title: true, signatureDate: true, contractingAuthority: true },
    });
    recentEntries = contracts.map((c) => ({
      date: c.signatureDate!.toISOString(),
      label: `${c.title} · ${c.contractingAuthority}`,
      ref: c.reference,
    }));
  } else if (r.registerType === RegisterType.SHAREHOLDERS) {
    const sh = await prisma.shareholder.findMany({
      where: { tenantId },
      orderBy: { numberOfShares: "desc" },
      take: 10,
      select: { fullName: true, numberOfShares: true, percentage: true, acquisitionDate: true },
    });
    recentEntries = sh.map((s) => ({
      date: s.acquisitionDate.toISOString(),
      label: `${s.fullName} · ${s.numberOfShares.toLocaleString("fr-FR")} parts (${s.percentage}%)`,
    }));
  }

  return NextResponse.json({
    id: r.id,
    registerType: r.registerType,
    name: r.name,
    description: r.description,
    legalBasis: r.legalBasis,
    status: r.status,
    entriesCount: r.entriesCount,
    lastEntryDate: r.lastEntryDate?.toISOString() ?? null,
    nextReviewDate: r.nextReviewDate.toISOString(),
    daysToReview: daysUntil(r.nextReviewDate),
    responsible: {
      id: r.responsibleUser.id,
      fullName: `${r.responsibleUser.firstName} ${r.responsibleUser.lastName}`,
      role: r.responsibleUser.role,
    },
    severity:
      r.status === RegisterStatus.OVERDUE
        ? "rose"
        : r.status === RegisterStatus.TO_UPDATE
          ? "amber"
          : "emerald",
    recentEntries,
  });
}
