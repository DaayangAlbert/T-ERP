import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

const payrollInputPatchSchema = z.object({
  daysWorked: z.number().int().min(0).max(31).optional(),
  overtimeHours: z.number().min(0).max(300).optional(),
  primaryBonus: z.number().min(0).max(100_000_000).optional(),
  advances: z.string().regex(/^\d+$/).optional(),
  category: z.string().min(1).max(80).optional(),
});

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
  if (
    (cycle.status !== "DRAFT" && cycle.status !== "CALCULATED") ||
    cycle.n1ValidatedAt ||
    cycle.n2ValidatedAt ||
    cycle.n3ValidatedAt
  ) {
    return NextResponse.json(
      { error: "Cycle de paie verrouille. Regeneration reservee aux profils autorises." },
      { status: 423 }
    );
  }

  try {
    const body = payrollInputPatchSchema.parse(await req.json().catch(() => ({})));

    await prisma.payrollInput.upsert({
      where: {
        payrollCycleId_employeeKey: {
          payrollCycleId: cycle.id,
          employeeKey: params.employeeKey,
        },
      },
      update: {
        ...(body.daysWorked !== undefined && { daysWorked: body.daysWorked }),
        ...(body.overtimeHours !== undefined && { overtimeHours: body.overtimeHours }),
        ...(body.primaryBonus !== undefined && {
          bonuses: [{ code: "PRIMA", label: "Prime mensuelle", amount: body.primaryBonus }] as object,
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
            ? ([{ code: "PRIMA", label: "Prime mensuelle", amount: body.primaryBonus }] as object)
            : ([] as object),
        advances: BigInt(body.advances ?? "0"),
        savedAt: new Date(),
        savedBy: session.sub,
      },
    });

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/rh/payroll/cycles/:id/inputs/:employeeKey]", err);
    return NextResponse.json({ error: "Erreur sauvegarde saisie paie" }, { status: 500 });
  }
}
