import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";
import { DailyReportStatus } from "@prisma/client";

const schema = z.object({ dailyReportId: z.string() });

export async function POST(req: Request) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, siteId } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.siteDailyReport.findFirst({
    where: { id: parsed.data.dailyReportId, siteId },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  if (report.status !== DailyReportStatus.DRAFT) {
    return NextResponse.json({ error: "Rapport déjà soumis" }, { status: 409 });
  }

  await prisma.siteDailyReport.update({
    where: { id: report.id },
    data: { status: DailyReportStatus.SUBMITTED, submittedById: session.sub },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "cc.production.submit",
      entityType: "SiteDailyReport",
      entityId: report.id,
      metadata: { siteId, productionValue: Number(report.productionValue) },
    },
  });

  return NextResponse.json({ ok: true });
}
