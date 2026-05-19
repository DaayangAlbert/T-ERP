import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { buildPayrollStateForCycle } from "@/lib/payroll/build-payroll-state";
import { PayrollStatePDF } from "@/components/payroll/PayrollStatePDF";
import { buildBankTransferOrder, buildPayrollStateCsv } from "@/lib/payroll/payroll-exports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET(req: Request, { params }: { params: { period: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Export paie reserve DAF/DG" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { tenantId: session.tenantId, period: params.period },
    select: { id: true },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  const state = await buildPayrollStateForCycle({ cycleId: cycle.id, tenantId: session.tenantId });
  const type = new URL(req.url).searchParams.get("type") ?? "full";

  if (type === "wire-order") {
    const csv = buildBankTransferOrder(state);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ordre_virement_${params.period}.csv"`,
      },
    });
  }

  if (type === "csv" || type === "dipe" || type === "irpp") {
    const csv = buildPayrollStateCsv(state);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="etat_paie_${type}_${params.period}.csv"`,
      },
    });
  }

  const element = createElement(PayrollStatePDF, { state }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etat_paie_${params.period}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
