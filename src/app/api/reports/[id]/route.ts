import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const r = await prisma.report.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: { author: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: r.id,
    type: r.type,
    title: r.title,
    period: r.period,
    status: r.status,
    parameters: r.parameters,
    blocks: r.blocks,
    data: r.data,
    pdfUrl: r.pdfUrl,
    scheduledRule: r.scheduledRule,
    recipients: r.recipients ?? [],
    author: { name: `${r.author.firstName} ${r.author.lastName}`, email: r.author.email },
    generatedAt: r.generatedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const r = await prisma.report.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.report.delete({ where: { id: r.id } });
  return NextResponse.json({ ok: true });
}
