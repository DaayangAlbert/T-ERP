import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSite, guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { MoaReportType } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  reportType: z.nativeEnum(MoaReportType),
  period: z.string().optional(),
  content: z.unknown().default({}),
});

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSite(params.siteId);
  if (guard instanceof NextResponse) return guard;

  const items = await prisma.moaReport.findMany({
    where: { siteId: params.siteId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      period: r.period,
      pdfUrl: r.pdfUrl,
      sentTo: r.sentTo,
      sentAt: r.sentAt?.toISOString() ?? null,
      acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
      author: r.author,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Génération "synthétique" — en production : assembler avancement + photos + écarts
  const now = new Date();
  const period =
    parsed.data.period ??
    (parsed.data.reportType === MoaReportType.WEEKLY_PROGRESS
      ? `${now.getFullYear()}-W${getISOWeek(now)}`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const created = await prisma.moaReport.create({
    data: {
      siteId: params.siteId,
      reportType: parsed.data.reportType,
      period,
      content: (parsed.data.content as object) ?? {},
      pdfUrl: `/stub/moa-${parsed.data.reportType}-${period}.pdf`,
      authorId: session.sub,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.moa-report.generate",
      entityType: "MoaReport",
      entityId: created.id,
      metadata: { siteId: params.siteId, type: parsed.data.reportType, period },
    },
  });

  return NextResponse.json({ id: created.id, period, pdfUrl: created.pdfUrl }, { status: 201 });
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
