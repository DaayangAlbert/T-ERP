import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { fundCashboxSchema } from "@/schemas/finance";
import { Role, CashDirection, MovementDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DG, Role.DAF];

/**
 * Approvisionne une caisse chantier depuis un compte bancaire :
 * débite la banque (sortie) et crédite la caisse (entrée) de manière atomique.
 * Trace un BankMovement (OUTBOUND, taggé chantier) + un CashboxMovement (IN).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = fundCashboxSchema.parse(await req.json());
    const amount = BigInt(data.amount);

    const cashbox = await prisma.siteCashbox.findFirst({
      where: { id: params.id, site: { tenantId: session.tenantId } },
      include: { site: { select: { code: true, name: true } } },
    });
    if (!cashbox) return NextResponse.json({ error: "Caisse introuvable" }, { status: 404 });
    if (!cashbox.isActive) return NextResponse.json({ error: "Caisse clôturée" }, { status: 400 });

    const bank = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, tenantId: session.tenantId },
    });
    if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
    if (!bank.isActive) return NextResponse.json({ error: "Compte bancaire clôturé" }, { status: 400 });

    // Découvert autorisé = ligne de crédit disponible.
    const availableCredit = bank.creditLineGranted - bank.creditLineUsed;
    if (bank.balance - amount < -availableCredit) {
      return NextResponse.json(
        { error: "Solde + ligne de crédit insuffisants sur le compte bancaire" },
        { status: 400 }
      );
    }

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();

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
              counterparty: `Caisse ${cashbox.site.code}`,
              siteId: cashbox.siteId,
              occurredAt,
            },
          },
        },
      }),
      prisma.siteCashbox.update({
        where: { id: cashbox.id },
        data: {
          balance: cashbox.balance + amount,
          movements: {
            create: {
              direction: CashDirection.IN,
              amount,
              reason: data.reason,
              reference: data.reference ?? null,
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
          action: "cashbox.fund",
          entityType: "SiteCashbox",
          entityId: cashbox.id,
          metadata: {
            bankAccountId: bank.id,
            bank: bank.bank,
            amount: data.amount,
            siteCode: cashbox.site.code,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      bankBalance: (bank.balance - amount).toString(),
      cashboxBalance: (cashbox.balance + amount).toString(),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/cashboxes/[id]/fund]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
