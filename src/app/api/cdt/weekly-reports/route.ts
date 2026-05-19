import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createWeeklyReportSchema } from "@/schemas/cdt-weekly-report";

export const dynamic = "force-dynamic";

const AUTHOR_ROLES: Role[] = [Role.WORKS_MANAGER];
const VIEWER_ROLES: Role[] = [
  Role.WORKS_MANAGER,
  Role.WORKS_DIRECTOR,
  Role.TECH_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.SUPER_ADMIN,
];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? undefined;

  // Un CDT ne voit que ses propres rapports ; les superviseurs voient tout le tenant.
  const where: Prisma.CdtWeeklyReportWhereInput =
    session.role === Role.WORKS_MANAGER
      ? { authorId: session.sub }
      : { tenantId: session.tenantId ?? undefined };

  if (statusFilter) where.status = statusFilter as Prisma.CdtWeeklyReportWhereInput["status"];

  const reports = await prisma.cdtWeeklyReport.findMany({
    where,
    orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      _count: { select: { sites: true } },
    },
    take: 100,
  });

  return NextResponse.json({
    items: reports.map((r) => ({
      id: r.id,
      weekStart: r.weekStart.toISOString(),
      weekEnd: r.weekEnd.toISOString(),
      weekLabel: r.weekLabel,
      status: r.status,
      author: `${r.author.firstName} ${r.author.lastName}`,
      sitesCount: r._count.sites,
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
    return NextResponse.json({ error: "Réservé Conducteur de Travaux" }, { status: 403 });
  }

  try {
    const body = createWeeklyReportSchema.parse(await req.json());
    const weekStart = new Date(body.weekStart);
    const weekEnd = new Date(body.weekEnd);
    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime()) || weekEnd <= weekStart) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }

    const created = await prisma.cdtWeeklyReport.create({
      data: {
        tenantId: session.tenantId,
        authorId: session.sub,
        weekStart,
        weekEnd,
        weekLabel: body.weekLabel ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/cdt/weekly-reports]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
