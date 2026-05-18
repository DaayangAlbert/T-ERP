import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createDafMonthlyReportSchema } from "@/schemas/daf-monthly-report";

export const dynamic = "force-dynamic";

const AUTHOR_ROLES: Role[] = [Role.DAF];
const VIEWER_ROLES: Role[] = [
  Role.DAF,
  Role.DG,
  Role.ACCOUNTANT,
  Role.SUPER_ADMIN,
  Role.TENANT_ADMIN,
];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? undefined;

  const where: Prisma.DafMonthlyFinancialReportWhereInput = { tenantId: session.tenantId };
  if (session.role === Role.DAF) where.authorId = session.sub;
  if (statusFilter) where.status = statusFilter as Prisma.DafMonthlyFinancialReportWhereInput["status"];

  const reports = await prisma.dafMonthlyFinancialReport.findMany({
    where,
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    items: reports.map((r) => ({
      id: r.id,
      period: r.period.toISOString(),
      periodLabel: r.periodLabel,
      status: r.status,
      author: `${r.author.firstName} ${r.author.lastName}`,
      revenueMonthXAF: r.revenueMonthXAF.toString(),
      cashBalanceXAF: r.cashBalanceXAF.toString(),
      grossMarginPercent: r.grossMarginPercent,
      overdueReceivablesXAF: r.overdueReceivablesXAF.toString(),
      dso: r.dso,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      validatedBy: r.validatedBy ? `${r.validatedBy.firstName} ${r.validatedBy.lastName}` : null,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!AUTHOR_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Directeur Administratif et Financier" }, { status: 403 });
  }

  try {
    const body = createDafMonthlyReportSchema.parse(await req.json());
    const period = new Date(body.period);
    if (Number.isNaN(period.getTime())) {
      return NextResponse.json({ error: "Mois invalide" }, { status: 400 });
    }

    const created = await prisma.dafMonthlyFinancialReport.create({
      data: {
        tenantId: session.tenantId,
        authorId: session.sub,
        period,
        periodLabel: body.periodLabel ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/daf/monthly-reports]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
