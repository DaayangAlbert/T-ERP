import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, CashDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

const movementSchema = z.object({
  cashboxId: z.string(),
  direction: z.nativeEnum(CashDirection),
  amount: z.coerce.number().positive(),
  reason: z.string().min(2),
  reference: z.string().optional(),
  occurredAt: z.string().optional(),
});

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const cashboxes = await prisma.siteCashbox.findMany({
    where: allowed === null
      ? { site: { tenantId: session.tenantId } }
      : { siteId: { in: allowed } },
    include: {
      site: { select: { id: true, code: true, name: true } },
      movements: { orderBy: { occurredAt: "desc" }, take: 10 },
    },
  });

  return NextResponse.json({
    items: cashboxes.map((c) => ({
      id: c.id,
      siteId: c.siteId,
      siteCode: c.site.code,
      siteName: c.site.name,
      balance: Number(c.balance),
      custodianId: c.custodianId,
      recentMovements: c.movements.map((m) => ({
        id: m.id,
        direction: m.direction,
        amount: Number(m.amount),
        reason: m.reason,
        reference: m.reference,
        occurredAt: m.occurredAt.toISOString(),
      })),
    })),
    scope: { isDirection: allowed === null },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CPT);
  if (denied) return denied;

  const parsed = movementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const cashbox = await prisma.siteCashbox.findFirst({
    where: { id: parsed.data.cashboxId },
    select: { id: true, siteId: true, balance: true },
  });
  if (!cashbox) return NextResponse.json({ error: "Caisse introuvable" }, { status: 404 });
  if (!isSiteAllowed(allowed, cashbox.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  const delta = parsed.data.direction === CashDirection.IN ? parsed.data.amount : -parsed.data.amount;
  const newBalance = Number(cashbox.balance) + delta;
  if (newBalance < 0) {
    return NextResponse.json({ error: "Solde caisse négatif interdit" }, { status: 400 });
  }

  const movement = await prisma.cashboxMovement.create({
    data: {
      cashboxId: cashbox.id,
      direction: parsed.data.direction,
      amount: BigInt(Math.round(parsed.data.amount)),
      reason: parsed.data.reason,
      reference: parsed.data.reference ?? null,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      recordedById: session.sub,
    },
  });

  await prisma.siteCashbox.update({
    where: { id: cashbox.id },
    data: { balance: BigInt(newBalance) },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "cashbox.movement",
      entityType: "CashboxMovement",
      entityId: movement.id,
      metadata: {
        cashboxId: cashbox.id,
        direction: parsed.data.direction,
        amount: parsed.data.amount,
      },
    },
  });

  return NextResponse.json({ id: movement.id, newBalance }, { status: 201 });
}
