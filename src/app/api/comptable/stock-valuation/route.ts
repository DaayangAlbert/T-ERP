import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  // Vue PMP : on agrège StockMovement par item + par site
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowed !== null) {
    where.OR = [{ fromSiteId: { in: allowed } }, { toSiteId: { in: allowed } }];
  }
  const movements = await prisma.stockMovement.findMany({ where });

  const byItem = new Map<string, { code: string; label: string; qty: number; value: number }>();
  for (const m of movements) {
    const sign = m.type === "INBOUND" ? 1 : m.type === "OUTBOUND" ? -1 : 0;
    if (sign === 0) continue;
    const cur = byItem.get(m.itemCode) ?? { code: m.itemCode, label: m.itemLabel, qty: 0, value: 0 };
    cur.qty += sign * m.quantity;
    cur.value += sign * Number(m.totalValue);
    byItem.set(m.itemCode, cur);
  }

  const items = Array.from(byItem.values()).map((x) => ({
    ...x,
    pmp: x.qty > 0 ? x.value / x.qty : 0,
  }));

  return NextResponse.json({
    items,
    totalValue: items.reduce((s, i) => s + Math.max(0, i.value), 0),
    scope: { isDirection: allowed === null },
  });
}
