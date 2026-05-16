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
  const account = url.searchParams.get("account");
  const period = url.searchParams.get("period");
  const allowed = await getAccessibleSiteIds(session.sub);

  if (!account) return NextResponse.json({ error: "Compte requis" }, { status: 400 });

  const where: Record<string, unknown> = {
    accountCode: { startsWith: account },
    entry: { tenantId: session.tenantId },
  };
  if (allowed !== null) {
    where.entry = { tenantId: session.tenantId, siteId: { in: allowed } };
  }
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [yy, mm] = period.split("-").map(Number);
    (where.entry as Record<string, unknown>).entryDate = {
      gte: new Date(yy, mm - 1, 1),
      lt: new Date(yy, mm, 1),
    };
  }

  const lines = await prisma.entryLine.findMany({
    where,
    include: {
      entry: { select: { entryDate: true, journalCode: true, reference: true, description: true } },
      site: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });

  let runningBalance = 0;
  const items = lines.map((l) => {
    runningBalance += Number(l.debit) - Number(l.credit);
    return {
      id: l.id,
      date: l.entry.entryDate.toISOString(),
      journal: l.entry.journalCode,
      reference: l.entry.reference,
      description: l.description || l.entry.description,
      debit: Number(l.debit),
      credit: Number(l.credit),
      siteCode: l.site?.code ?? null,
      lettering: l.lettering,
      balance: runningBalance,
    };
  });

  return NextResponse.json({
    account,
    period: period ?? null,
    items,
    finalBalance: runningBalance,
    scope: { isDirection: allowed === null },
  });
}
