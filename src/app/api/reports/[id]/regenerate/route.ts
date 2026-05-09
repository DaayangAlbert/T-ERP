import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateReportSnapshot, type ReportSnapshot } from "@/lib/report-generator";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const scope = ((report.parameters as { scope?: ReportSnapshot["scope"] }).scope ?? "GROUP") as ReportSnapshot["scope"];
  const snapshot = await generateReportSnapshot(session.tenantId, report.period, scope);

  await prisma.report.update({
    where: { id: report.id },
    data: {
      data: snapshot as unknown as object,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
