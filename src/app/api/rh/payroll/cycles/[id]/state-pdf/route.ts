import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getCurrentSession } from "@/lib/session";
import { canReadPayrollState } from "@/lib/payroll/payroll-access";
import { buildPayrollStateForCycle } from "@/lib/payroll/build-payroll-state";
import { PayrollStatePDF } from "@/components/payroll/PayrollStatePDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canReadPayrollState(session.role)) {
    return NextResponse.json({ error: "Acces paie refuse" }, { status: 403 });
  }

  try {
    const state = await buildPayrollStateForCycle({ cycleId: params.id, tenantId: session.tenantId });
    const element = createElement(PayrollStatePDF, { state }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="etat_salaires_${state.cycle.period}.pdf"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PAYROLL_CYCLE_NOT_FOUND") {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }
    console.error("[GET /api/rh/payroll/cycles/:id/state-pdf]", err);
    return NextResponse.json({ error: "Erreur PDF etat des salaires" }, { status: 500 });
  }
}
