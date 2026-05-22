import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { fundProjectAccountSchema } from "@/schemas/finance";
import { Role, CptDirection, MovementDirection, ProjectAccountEntryType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DG, Role.DAF];

/**
 * Approvisionne un compte projet depuis un compte bancaire (banque → projet).
 * Atomique : débite la banque (OUTBOUND) + crédite le compte projet (FUNDING).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = fundProjectAccountSchema.parse(await req.json());
    const amount = BigInt(data.amount);
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const account = await prisma.projectAccount.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
      include: { site: { select: { code: true } } },
    });
    if (!account) return NextResponse.json({ error: "Compte projet introuvable" }, { status: 404 });
    if (!account.isActive) return NextResponse.json({ error: "Compte projet clôturé" }, { status: 400 });

    const bank = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, tenantId: { in: scopeIds } },
    });
    if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
    if (!bank.isActive) return NextResponse.json({ error: "Compte bancaire clôturé" }, { status: 400 });

    const availableCredit = bank.creditLineGranted - bank.creditLineUsed;
    if (bank.balance - amount < -availableCredit) {
      return NextResponse.json(
        { error: "Solde + ligne de crédit insuffisants sur le compte bancaire" },
        { status: 400 },
      );
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    const newBalance = account.balance + amount; // FUNDING = crédit

    await prisma.$transaction([
      prisma.bankAccount.update({
        where: { id: bank.id },
        data: {
          balance: bank.balance - amount,
          movements: {
            create: {
              direction: MovementDirection.OUTBOUND,
              amount,
              label: data.reason,
              reference: data.reference ?? null,
              counterparty: `Compte projet ${account.site.code}`,
              siteId: account.siteId,
              occurredAt,
            },
          },
        },
      }),
      prisma.projectAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          ...(account.bankAccountId ? {} : { bankAccountId: bank.id }),
          movements: {
            create: {
              type: ProjectAccountEntryType.FUNDING,
              direction: CptDirection.CREDIT,
              amount,
              reason: data.reason,
              reference: data.reference ?? null,
              balanceAfter: newBalance,
              occurredAt,
              recordedById: session.sub,
            },
          },
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.sub,
          action: "cpt.project_account.fund",
          entityType: "ProjectAccount",
          entityId: account.id,
          metadata: { bankAccountId: bank.id, amount: data.amount, siteCode: account.site.code },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      bankBalance: (bank.balance - amount).toString(),
      accountBalance: newBalance.toString(),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/project-accounts/[id]/fund]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
