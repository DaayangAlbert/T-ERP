import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createCashboxSchema } from "@/schemas/finance";
import { Role, CashDirection } from "@prisma/client";

export const dynamic = "force-dynamic";

const VIEW_ROLES: Role[] = [Role.DG, Role.DAF, Role.ACCOUNTANT];
const MANAGE_ROLES: Role[] = [Role.DG, Role.DAF];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction financière" }, { status: 403 });
  }

  const cashboxes = await prisma.siteCashbox.findMany({
    where: { site: { tenantId: session.tenantId } },
    include: { site: { select: { id: true, code: true, name: true } } },
    orderBy: { site: { code: "asc" } },
  });

  // Résolution des dépositaires (custodianId → nom).
  const custodianIds = [...new Set(cashboxes.map((c) => c.custodianId).filter(Boolean))];
  const custodians = await prisma.user.findMany({
    where: { id: { in: custodianIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const custodianMap = new Map(custodians.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  const activeTotal = cashboxes
    .filter((c) => c.isActive)
    .reduce((s, c) => s + c.balance, 0n);

  return NextResponse.json({
    items: cashboxes.map((c) => ({
      id: c.id,
      siteId: c.siteId,
      siteCode: c.site.code,
      siteName: c.site.name,
      balance: c.balance.toString(),
      custodianId: c.custodianId,
      custodianName: custodianMap.get(c.custodianId) ?? null,
      isActive: c.isActive,
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
    summary: {
      total: cashboxes.length,
      activeTotal: activeTotal.toString(),
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / DAF" }, { status: 403 });
  }

  try {
    const data = createCashboxSchema.parse(await req.json());

    const site = await prisma.site.findFirst({
      where: { id: data.siteId, tenantId: session.tenantId },
      select: { id: true, code: true, managerId: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    const existing = await prisma.siteCashbox.findUnique({ where: { siteId: site.id } });
    if (existing) {
      return NextResponse.json({ error: "Ce chantier a déjà une caisse" }, { status: 409 });
    }

    const custodianId = data.custodianId || site.managerId || session.sub;
    const opening = BigInt(data.initialBalance);

    const cashbox = await prisma.siteCashbox.create({
      data: {
        siteId: site.id,
        custodianId,
        balance: opening,
        ...(opening > 0n
          ? {
              movements: {
                create: {
                  direction: CashDirection.IN,
                  amount: opening,
                  reason: "Solde d'ouverture",
                  occurredAt: new Date(),
                  recordedById: session.sub,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "cashbox.create",
        entityType: "SiteCashbox",
        entityId: cashbox.id,
        metadata: { siteId: site.id, siteCode: site.code, opening: data.initialBalance },
      },
    });

    return NextResponse.json({ id: cashbox.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/cashboxes]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
