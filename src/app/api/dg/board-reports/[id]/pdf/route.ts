import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { BoardReportPDF } from "@/components/payroll/BoardReportPDF";
import type { BoardReportData } from "@/lib/board-report-generator";
import { Role } from "@prisma/client";

export const runtime = "nodejs";
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
      author: { select: { firstName: true, lastName: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  }

  const props = {
    report: {
      period: report.period,
      boardDate: report.boardDate.toISOString(),
      type: report.type,
      tenantName: report.tenant?.name ?? "—",
      authorName: `${report.author.firstName} ${report.author.lastName}`,
      chapters: (report.chapters as Record<string, boolean>) ?? {},
      comments: (report.comments as Record<string, string>) ?? {},
      data: report.data as unknown as BoardReportData,
    },
  };

  const element = createElement(BoardReportPDF, props) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `reporting_ca_${report.period}_${report.tenant?.name?.replace(/\s+/g, "_") ?? "tenant"}.pdf`;
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
