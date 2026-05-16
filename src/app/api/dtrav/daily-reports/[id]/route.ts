import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { DailyReportStatus } from "@prisma/client";

const actionSchema = z.object({
  action: z.enum(["validate", "reject"]),
  reason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const report = await prisma.siteDailyReport.findUnique({
    where: { id: params.id },
    select: { id: true, siteId: true, status: true },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(report.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (report.status !== DailyReportStatus.SUBMITTED) {
    return NextResponse.json({ error: "Rapport non en attente de validation" }, { status: 409 });
  }

  if (parsed.data.action === "validate") {
    await prisma.siteDailyReport.update({
      where: { id: report.id },
      data: {
        status: DailyReportStatus.VALIDATED,
        validatedById: session.sub,
        validatedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId!,
        userId: session.sub,
        action: "dtrav.daily-report.validate",
        entityType: "SiteDailyReport",
        entityId: report.id,
        metadata: { siteId: report.siteId },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reject") {
    if (!parsed.data.reason || parsed.data.reason.length < 5) {
      return NextResponse.json({ error: "Motif obligatoire" }, { status: 400 });
    }
    await prisma.siteDailyReport.update({
      where: { id: report.id },
      data: {
        status: DailyReportStatus.REJECTED,
        rejectReason: parsed.data.reason,
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId!,
        userId: session.sub,
        action: "dtrav.daily-report.reject",
        entityType: "SiteDailyReport",
        entityId: report.id,
        metadata: { reason: parsed.data.reason },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
