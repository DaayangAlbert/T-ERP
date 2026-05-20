import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createBankAccountSchema } from "@/schemas/finance";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG, Role.DAF];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.bankAccount.findMany({
    where: { tenantId: session.tenantId, isActive: true },
    orderBy: { bank: "asc" },
  });

  const totalBalance = items.reduce((s, b) => s + b.balance, 0n);
  const totalGranted = items.reduce((s, b) => s + b.creditLineGranted, 0n);
  const totalUsed = items.reduce((s, b) => s + b.creditLineUsed, 0n);

  return NextResponse.json({
    items: items.map((b) => ({
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
    })),
    summary: {
      total: items.length,
      totalBalance: totalBalance.toString(),
      totalGranted: totalGranted.toString(),
      totalUsed: totalUsed.toString(),
      totalAvailable: (totalGranted - totalUsed).toString(),
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = createBankAccountSchema.parse(await req.json());

    const existing = await prisma.bankAccount.findFirst({
      where: { tenantId: session.tenantId, accountNumber: data.accountNumber },
    });
    if (existing) {
      return NextResponse.json({ error: "Un compte avec ce numéro existe déjà" }, { status: 409 });
    }

    const created = await prisma.bankAccount.create({
      data: {
        tenantId: session.tenantId,
        bank: data.bank,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        currency: data.currency,
        balance: BigInt(data.balance),
        creditLineGranted: BigInt(data.creditLineGranted),
        creditLineUsed: 0n,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        contact: data.contact ? (data.contact as object) : undefined,
        syncStatus: "MANUAL",
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "bank.create",
        entityType: "BankAccount",
        entityId: created.id,
        metadata: { bank: data.bank, accountNumber: data.accountNumber },
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/banks]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
