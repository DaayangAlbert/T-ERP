import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { salaryMovementSchema } from "@/schemas/finance";
import { Role, CptDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// POST — mouvement manuel sur le compte salaire (ex: paiement de la masse
// salariale siège = DEBIT, dotation = CREDIT).
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const data = salaryMovementSchema.parse(await req.json());
    const amount = BigInt(data.amount);
    const direction = data.direction === "CREDIT" ? CptDirection.CREDIT : CptDirection.DEBIT;

    const account = await prisma.salaryAccount.upsert({
      where: { tenantId: session.tenantId },
      create: { tenantId: session.tenantId },
      update: {},
      select: { id: true, balance: true },
    });

    const newBalance = account.balance + (direction === CptDirection.CREDIT ? amount : -amount);
    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

    await prisma.salaryAccountMovement.create({
      data: {
        accountId: account.id,
        direction,
        amount,
        reason: data.reason,
        reference: data.reference ?? null,
        balanceAfter: newBalance,
        occurredAt,
        recordedById: session.sub,
      },
    });
    await prisma.salaryAccount.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });

    return NextResponse.json({ ok: true, balance: newBalance.toString() });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/salary-account/movements]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
