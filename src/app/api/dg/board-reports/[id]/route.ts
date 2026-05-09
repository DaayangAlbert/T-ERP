import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const report = await prisma.boardReport.findFirst({
    where: { id: params.id, tenantId: session.tenantId ?? undefined },
    include: {
      author: { select: { firstName: true, lastName: true, email: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  return NextResponse.json({
    id: report.id,
    type: report.type,
    period: report.period,
    boardDate: report.boardDate.toISOString(),
    status: report.status,
    chapters: report.chapters,
    comments: report.comments,
    data: report.data,
    sentTo: report.sentTo ?? [],
    author: report.author,
    tenant: report.tenant,
    pdfUrl: report.pdfUrl,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const report = await prisma.boardReport.findFirst({
    where: { id: params.id, tenantId: session.tenantId ?? undefined },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  await prisma.boardReport.delete({ where: { id: report.id } });
  return NextResponse.json({ ok: true });
}
