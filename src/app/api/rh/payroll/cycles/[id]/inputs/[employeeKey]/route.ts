import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; employeeKey: string } }
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Saisie réservée RH" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    daysWorked: number;
    overtimeHours: number;
    primaryBonus: number;
    advances: string;
    category: string;
  }>;

  await prisma.payrollInput.upsert({
    where: {
      payrollCycleId_employeeKey: {
        payrollCycleId: cycle.id,
        employeeKey: params.employeeKey,
      },
    },
    update: {
      ...(body.daysWorked !== undefined && { daysWorked: Math.max(0, Math.min(31, body.daysWorked)) }),
      ...(body.overtimeHours !== undefined && { overtimeHours: Math.max(0, body.overtimeHours) }),
      ...(body.primaryBonus !== undefined && {
        bonuses: [{ code: "PRIMA", label: "Prime mensuelle", amount: Math.max(0, body.primaryBonus) }] as object,
      }),
      ...(body.advances !== undefined && { advances: BigInt(body.advances || "0") }),
      savedAt: new Date(),
      savedBy: session.sub,
    },
    create: {
      payrollCycleId: cycle.id,
      employeeKey: params.employeeKey,
      category: body.category ?? "Journaliers",
      daysWorked: body.daysWorked ?? 22,
      overtimeHours: body.overtimeHours ?? 0,
      bonuses:
        body.primaryBonus !== undefined
          ? ([{ code: "PRIMA", label: "Prime mensuelle", amount: Math.max(0, body.primaryBonus) }] as object)
          : ([] as object),
      advances: BigInt(body.advances ?? "0"),
      savedAt: new Date(),
      savedBy: session.sub,
    },
  });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
