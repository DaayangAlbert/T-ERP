import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { ReconciliationStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DIRECTION_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/** Rapprochement bancaire réservé Comptable Direction / DAF (jamais comptable chantier). */
async function ensureDirection(session: { sub: string; role: string }) {
  if (!DIRECTION_ROLES.includes(session.role as Role)) return false;
  if (session.role === Role.ACCOUNTANT) {
    const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { assignedSiteIds: true } });
    if (u && u.assignedSiteIds.length > 0) return false;
  }
  return true;
}

/**
 * GET /api/comptable/reconciliation?bankAccountId=...&period=YYYY-MM
 *   → mouvements bancaires (BankMovement) sur la période + rapprochement existant.
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await ensureDirection(session))) {
    return NextResponse.json({ error: "Réservé Comptable Direction / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const bankAccountId = url.searchParams.get("bankAccountId");
  const period = url.searchParams.get("period");
  if (!bankAccountId || !period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Paramètres bankAccountId et period (YYYY-MM) requis" }, { status: 400 });
  }

  const bank = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, tenantId: session.tenantId },
    select: { id: true, bank: true, accountNumber: true, currency: true, balance: true },
  });
  if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });

  const [yy, mm] = period.split("-").map(Number);
  const gte = new Date(yy, mm - 1, 1);
  const lt = new Date(yy, mm, 1);

  const [movements, existing] = await Promise.all([
    prisma.bankMovement.findMany({
      where: { bankAccountId: bank.id, occurredAt: { gte, lt } },
      orderBy: { occurredAt: "asc" },
    }),
    prisma.bankReconciliation.findFirst({
      where: { tenantId: session.tenantId, bankAccountId: bank.id, period },
    }),
  ]);

  return NextResponse.json({
    bank: {
      id: bank.id,
      label: `${bank.bank} · ${bank.accountNumber}`,
      currency: bank.currency,
      balance: bank.balance.toString(),
    },
    period,
    movements: movements.map((m) => ({
      id: m.id,
      direction: m.direction, // INBOUND | OUTBOUND
      amount: m.amount.toString(),
      label: m.label,
      reference: m.reference,
      occurredAt: m.occurredAt.toISOString(),
    })),
    existing: existing
      ? {
          id: existing.id,
          status: existing.status,
          bookBalance: existing.bookBalance.toString(),
          bankBalance: existing.bankBalance.toString(),
          gap: existing.gap.toString(),
          reconciledItems: existing.reconciledItems,
          completedAt: existing.completedAt?.toISOString() ?? null,
        }
      : null,
  });
}

const saveSchema = z.object({
  bankAccountId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  bookBalance: z.string().regex(/^-?\d+$/),
  bankBalance: z.string().regex(/^-?\d+$/),
  reconciledItems: z.array(z.string()),
  status: z.nativeEnum(ReconciliationStatus).optional(),
});

/**
 * POST /api/comptable/reconciliation
 *   { bankAccountId, period, bookBalance, bankBalance, reconciledItems, status? }
 * Crée / met à jour le snapshot du rapprochement.
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await ensureDirection(session))) {
    return NextResponse.json({ error: "Réservé Comptable Direction / DAF" }, { status: 403 });
  }

  try {
    const data = saveSchema.parse(await req.json());
    const bank = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });

    const bookBal = BigInt(data.bookBalance);
    const bankBal = BigInt(data.bankBalance);
    const gap = bookBal - bankBal;
    const status = data.status ?? (gap === 0n ? ReconciliationStatus.COMPLETED : ReconciliationStatus.IN_PROGRESS);

    const existing = await prisma.bankReconciliation.findFirst({
      where: { tenantId: session.tenantId, bankAccountId: bank.id, period: data.period },
    });

    const payload = {
      bookBalance: bookBal,
      bankBalance: bankBal,
      gap,
      reconciledItems: data.reconciledItems,
      status,
      completedAt: status === ReconciliationStatus.COMPLETED ? new Date() : null,
    };

    const saved = existing
      ? await prisma.bankReconciliation.update({ where: { id: existing.id }, data: payload })
      : await prisma.bankReconciliation.create({
          data: { tenantId: session.tenantId, bankAccountId: bank.id, period: data.period, ...payload },
        });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "cpt.reconciliation.save",
        entityType: "BankReconciliation",
        entityId: saved.id,
        metadata: { period: data.period, status, gap: gap.toString() },
      },
    });

    return NextResponse.json({ id: saved.id, status, gap: gap.toString() });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/comptable/reconciliation]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
