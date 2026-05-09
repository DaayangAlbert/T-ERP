import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createReportSchema } from "@/schemas/report";
import { generateReportSnapshot } from "@/lib/report-generator";
import { ReportStatus, ReportType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ReportType | null;
  const status = url.searchParams.get("status") as ReportStatus | null;

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (type) where.type = type;
  if (status) where.status = status;

  const items = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      period: r.period,
      status: r.status,
      author: `${r.author.firstName} ${r.author.lastName}`,
      pdfUrl: r.pdfUrl,
      scheduledRule: r.scheduledRule,
      recipientCount: Array.isArray(r.recipients) ? r.recipients.length : 0,
      generatedAt: r.generatedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total: items.length,
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createReportSchema.parse(await req.json());
    const snapshot = await generateReportSnapshot(session.tenantId, data.period, data.scope);

    const created = await prisma.report.create({
      data: {
        tenantId: session.tenantId,
        authorId: session.sub,
        type: data.type,
        title: data.title,
        period: data.period,
        parameters: { scope: data.scope, signature: data.signature ?? null } as unknown as object,
        blocks: data.blocks as unknown as object,
        data: snapshot as unknown as object,
        status: ReportStatus.GENERATED,
        recipients: (data.recipients ?? []) as unknown as object,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
