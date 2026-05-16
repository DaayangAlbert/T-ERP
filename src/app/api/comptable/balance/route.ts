import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period");
  const type = url.searchParams.get("type") ?? "general"; // general | auxiliary
  const allowed = await getAccessibleSiteIds(session.sub);

  const entryWhere: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowed !== null) entryWhere.siteId = { in: allowed };
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [yy, mm] = period.split("-").map(Number);
    entryWhere.entryDate = { gte: new Date(yy, mm - 1, 1), lt: new Date(yy, mm, 1) };
  }

  const lines = await prisma.entryLine.findMany({
    where: { entry: entryWhere },
    select: { accountCode: true, debit: true, credit: true, thirdPartyId: true },
  });

  // Balance générale : agrégation par compte (premiers 4 chiffres)
  const map = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const key = type === "general" ? l.accountCode.slice(0, 4) : l.accountCode;
    const cur = map.get(key) ?? { debit: 0, credit: 0 };
    cur.debit += Number(l.debit);
    cur.credit += Number(l.credit);
    map.set(key, cur);
  }

  const accounts = Array.from(map.entries()).map(([code, v]) => ({
    code,
    debit: v.debit,
    credit: v.credit,
    balance: v.debit - v.credit,
  }));
  accounts.sort((a, b) => a.code.localeCompare(b.code));

  return NextResponse.json({
    type,
    period,
    accounts,
    totals: {
      debit: accounts.reduce((s, a) => s + a.debit, 0),
      credit: accounts.reduce((s, a) => s + a.credit, 0),
    },
  });
}
