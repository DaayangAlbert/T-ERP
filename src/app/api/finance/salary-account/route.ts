import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { linkSalaryBankSchema } from "@/schemas/finance";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];
const VIEW_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

// GET — compte salaire global du tenant (créé à la volée s'il n'existe pas).
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const account = await prisma.salaryAccount.upsert({
    where: { tenantId: session.tenantId },
    create: { tenantId: session.tenantId },
    update: {},
    include: {
      bankAccount: { select: { id: true, bank: true, accountNumber: true } },
      movements: { orderBy: { occurredAt: "desc" }, take: 100 },
    },
  });

  return NextResponse.json({
    id: account.id,
    bankAccountId: account.bankAccountId,
    bankLabel: account.bankAccount ? `${account.bankAccount.bank} · ${account.bankAccount.accountNumber}` : null,
    balance: account.balance.toString(),
    movements: account.movements.map((m) => ({
      id: m.id,
      direction: m.direction,
      amount: m.amount.toString(),
      reason: m.reason,
      reference: m.reference,
      siteId: m.siteId,
      balanceAfter: m.balanceAfter.toString(),
      occurredAt: m.occurredAt.toISOString(),
    })),
    canManage: MANAGE_ROLES.includes(session.role as Role),
  });
}

// PATCH — rattacher le compte salaire à un compte bancaire réel.
export async function PATCH(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const data = linkSalaryBankSchema.parse(await req.json());
    if (data.bankAccountId) {
      const scopeIds = await getTenantScopeIds(session.tenantId);
      const bank = await prisma.bankAccount.findFirst({
        where: { id: data.bankAccountId, tenantId: { in: scopeIds } },
        select: { id: true },
      });
      if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
    }

    await prisma.salaryAccount.upsert({
      where: { tenantId: session.tenantId },
      create: { tenantId: session.tenantId, bankAccountId: data.bankAccountId ?? null },
      update: { bankAccountId: data.bankAccountId ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/finance/salary-account]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
