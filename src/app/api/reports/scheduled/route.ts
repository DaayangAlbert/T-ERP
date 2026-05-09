import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createScheduledReportSchema } from "@/schemas/report";
import { ReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.report.findMany({
    where: { tenantId: session.tenantId, status: ReportStatus.SCHEDULED },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      rule: r.scheduledRule,
      author: `${r.author.firstName} ${r.author.lastName}`,
      blocks: r.blocks,
      recipients: r.recipients ?? [],
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createScheduledReportSchema.parse(await req.json());

    const created = await prisma.report.create({
      data: {
        tenantId: session.tenantId,
        authorId: session.sub,
        type: data.type,
        title: data.title,
        period: "scheduled",
        parameters: { scope: "GROUP" } as unknown as object,
        blocks: data.blocks as unknown as object,
        data: {} as unknown as object,
        status: ReportStatus.SCHEDULED,
        scheduledRule: data.rule,
        recipients: data.recipients as unknown as object,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/reports/scheduled]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
