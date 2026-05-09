import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG];

const stepSchema = z.object({
  step: z.enum(["pnl", "balance", "adjustments", "draft", "validate", "submit"]),
});

export async function POST(req: Request, { params }: { params: { year: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation finale réservée DG" }, { status: 403 });
  }

  try {
    const data = stepSchema.parse(await req.json());
    const year = parseInt(params.year, 10);
    const closure = await prisma.annualClosure.findFirst({
      where: { tenantId: session.tenantId, fiscalYear: year },
    });
    if (!closure) return NextResponse.json({ error: "Clôture introuvable" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (data.step === "pnl") updates.pnlValidated = true;
    if (data.step === "balance") updates.balanceValidated = true;
    if (data.step === "adjustments") updates.adjustmentsValidated = true;
    if (data.step === "draft") updates.draftGenerated = true;
    if (data.step === "validate") {
      updates.status = "VALIDATED";
      updates.dgValidatedAt = new Date();
      updates.dgValidatedBy = session.sub;
    }
    if (data.step === "submit") {
      updates.submittedToDgi = true;
      updates.status = "SUBMITTED";
    }

    await prisma.annualClosure.update({
      where: { id: closure.id },
      data: updates,
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: `closure.step.${data.step}`,
        entityType: "AnnualClosure",
        entityId: closure.id,
        metadata: { year, step: data.step },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
