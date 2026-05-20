import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateBankAccountSchema } from "@/schemas/finance";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG, Role.DAF];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const b = await prisma.bankAccount.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: b.id,
    bank: b.bank,
    accountNumber: b.accountNumber,
    accountType: b.accountType,
    currency: b.currency,
    balance: b.balance.toString(),
    creditLineGranted: b.creditLineGranted.toString(),
    creditLineUsed: b.creditLineUsed.toString(),
    creditLineAvailable: (b.creditLineGranted - b.creditLineUsed).toString(),
    renewalDate: b.renewalDate?.toISOString() ?? null,
    contact: b.contact,
    history12m: b.history12m,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = updateBankAccountSchema.parse(await req.json());
    const b = await prisma.bankAccount.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Unicité du numéro de compte si on le modifie.
    if (data.accountNumber !== undefined && data.accountNumber !== b.accountNumber) {
      const dup = await prisma.bankAccount.findFirst({
        where: { tenantId: session.tenantId, accountNumber: data.accountNumber, id: { not: b.id } },
      });
      if (dup) return NextResponse.json({ error: "Un compte avec ce numéro existe déjà" }, { status: 409 });
    }

    const closing = data.isActive === false && b.isActive;

    await prisma.bankAccount.update({
      where: { id: b.id },
      data: {
        ...(data.bank !== undefined && { bank: data.bank }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.balance !== undefined && { balance: BigInt(data.balance) }),
        ...(data.creditLineGranted !== undefined && { creditLineGranted: BigInt(data.creditLineGranted) }),
        ...(data.creditLineUsed !== undefined && { creditLineUsed: BigInt(data.creditLineUsed) }),
        ...(data.renewalDate !== undefined && {
          renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        }),
        ...(data.contact !== undefined && { contact: data.contact as object }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
          closedAt: data.isActive ? null : new Date(),
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: closing ? "bank.close" : "bank.update",
        entityType: "BankAccount",
        entityId: b.id,
        metadata: { changes: data },
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
