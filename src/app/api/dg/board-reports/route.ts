import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateBoardReportData } from "@/lib/board-report-generator";
import { createBoardReportSchema } from "@/schemas/board-report";
import { BoardReportStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const items = await prisma.boardReport.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 24,
    include: {
      author: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      type: r.type,
      period: r.period,
      boardDate: r.boardDate.toISOString(),
      status: r.status,
      author: `${r.author.firstName} ${r.author.lastName}`,
      sentToCount: Array.isArray(r.sentTo) ? r.sentTo.length : 0,
      createdAt: r.createdAt.toISOString(),
    })),
    total: items.length,
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ error: "Tenant requis" }, { status: 403 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  try {
    const data = createBoardReportSchema.parse(await req.json());

    // Snapshot KPIs au moment de la génération
    const reportData = await generateBoardReportData(
      session.tenantId,
      data.period,
      data.boardDate.toISOString()
    );

    const created = await prisma.boardReport.create({
      data: {
        tenantId: session.tenantId,
        authorId: session.sub,
        type: data.type,
        period: data.period,
        boardDate: data.boardDate,
        chapters: data.chapters,
        comments: data.comments,
        data: reportData as unknown as object,
        status: BoardReportStatus.GENERATED,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/dg/board-reports]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
