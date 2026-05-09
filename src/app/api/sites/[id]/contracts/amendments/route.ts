import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const amendmentSchema = z.object({
  ref: z.string().min(2).max(40),
  amount: z.string().min(1), // BigInt en string (peut être négatif)
  date: z.string(), // YYYY-MM-DD
  reason: z.string().min(3).max(300),
});

const ALLOWED: Role[] = [Role.DG, Role.DAF, Role.TECH_DIRECTOR];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé à la direction" }, { status: 403 });
  }

  try {
    const data = amendmentSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);
    const contract = await prisma.siteContract.findFirst({
      where: { siteId: params.id, site: { tenantId: { in: scopeIds } } },
    });
    if (!contract) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    const amendments = Array.isArray(contract.amendments) ? (contract.amendments as object[]) : [];
    const newAmendment = {
      ref: data.ref,
      amount: data.amount,
      date: data.date,
      reason: data.reason,
      validatedBy: `${session.sub}`,
      addedAt: new Date().toISOString(),
    };

    const newAmount = contract.currentAmount + BigInt(data.amount);

    await prisma.siteContract.update({
      where: { id: contract.id },
      data: {
        amendments: [...amendments, newAmendment] as object,
        currentAmount: newAmount,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "site.contract.amendment",
        entityType: "SiteContract",
        entityId: contract.id,
        metadata: { ref: data.ref, amount: data.amount, reason: data.reason },
      },
    });

    return NextResponse.json({ ok: true, currentAmount: newAmount.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
