import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { SyscohadaPDF } from "@/components/accounting/SyscohadaPDF";
import { SYSCOHADA_STATES, type SyscohadaStateKey } from "@/lib/syscohada";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { state: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const stateMeta = SYSCOHADA_STATES.find((s) => s.key === params.state);
  if (!stateMeta) return NextResponse.json({ error: "État inconnu" }, { status: 400 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  // Récupère les données de base de la période
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true },
  });
  const fp = await prisma.financialPeriod.findFirst({
    where: { tenantId: session.tenantId, period },
  });

  // Payload synthétique selon l'état
  let payload: Record<string, unknown> = {};
  if (params.state === "pnl" && fp) {
    payload = (fp.pnl as Record<string, unknown>) ?? {};
  } else if (params.state === "bs" && fp) {
    payload = (fp.balance as Record<string, unknown>) ?? {};
  } else {
    payload = { period, generatedAt: new Date().toISOString() };
  }

  const props = {
    state: params.state as SyscohadaStateKey,
    stateLabel: stateMeta.label,
    tenantName: tenant?.name ?? "—",
    period,
    payload,
    generatedAt: new Date().toISOString(),
  };

  const element = createElement(SyscohadaPDF, props) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `syscohada_${params.state}_${period}.pdf`;
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
