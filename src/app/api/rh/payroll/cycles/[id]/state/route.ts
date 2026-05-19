import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { canReadPayrollState } from "@/lib/payroll/payroll-access";
import { buildPayrollStateForCycle } from "@/lib/payroll/build-payroll-state";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canReadPayrollState(session.role)) {
    return NextResponse.json({ error: "Acces paie refuse" }, { status: 403 });
  }

  try {
    const state = await buildPayrollStateForCycle({ cycleId: params.id, tenantId: session.tenantId });
    return NextResponse.json(state);
  } catch (err) {
    if (err instanceof Error && err.message === "PAYROLL_CYCLE_NOT_FOUND") {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }
    console.error("[GET /api/rh/payroll/cycles/:id/state]", err);
    return NextResponse.json({ error: "Erreur etat des salaires" }, { status: 500 });
  }
}
