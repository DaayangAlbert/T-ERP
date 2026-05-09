import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { ReportPDF } from "@/components/reports/ReportPDF";
import type { ReportSnapshot } from "@/lib/report-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const report = await prisma.report.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      author: { select: { firstName: true, lastName: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  const params_ = (report.parameters ?? {}) as { signature?: string };
  const props = {
    report: {
      type: report.type,
      title: report.title,
      period: report.period,
      tenantName: report.tenant?.name ?? "—",
      authorName: `${report.author.firstName} ${report.author.lastName}`,
      signature: params_.signature ?? null,
      blocks: (report.blocks as string[]) ?? [],
      data: report.data as unknown as ReportSnapshot,
      generatedAt: (report.generatedAt ?? report.createdAt).toISOString(),
    },
  };

  const element = createElement(ReportPDF, props) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `rapport_${report.period}_${report.type.toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
