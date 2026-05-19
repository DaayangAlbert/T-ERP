import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { calculatePayrollCycle } from "@/lib/payroll/calculate-cycle";
import { canCalculatePayroll } from "@/lib/payroll/payroll-access";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!canCalculatePayroll(session.role)) {
    return NextResponse.json({ error: "Lancement reserve RH" }, { status: 403 });
  }

  try {
    const result = await calculatePayrollCycle({
      cycleId: params.id,
      tenantId: session.tenantId,
      actorUserId: session.sub,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PAYROLL_CALCULATION_FAILED";
    if (message === "PAYROLL_CYCLE_NOT_FOUND") {
      return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });
    }
    if (message === "PAYROLL_CYCLE_LOCKED" || message === "PAYROLL_CYCLE_ALREADY_VALIDATED") {
      return NextResponse.json({ error: "Cycle verrouille, validation deja engagee" }, { status: 422 });
    }
    console.error("[POST /api/rh/payroll/cycles/:id/calculate]", err);
    return NextResponse.json({ error: "Erreur calcul paie" }, { status: 500 });
  }
}
