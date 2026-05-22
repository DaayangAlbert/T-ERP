import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { createProjectAccountSchema } from "@/schemas/finance";
import { Role, ProjectAccountEntryType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];
const VIEW_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

// GET — comptes projet du périmètre (DAF/DG global ; comptable selon ses chantiers).
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const allowedSites = await getAccessibleSiteIds(session.sub); // null = global

  const accounts = await prisma.projectAccount.findMany({
    where: {
      tenantId: { in: scopeIds },
      ...(allowedSites === null ? {} : { siteId: { in: allowedSites } }),
    },
    include: {
      site: { select: { id: true, code: true, name: true, client: true, status: true } },
      bankAccount: { select: { id: true, bank: true, accountNumber: true } },
    },
    orderBy: { site: { code: "asc" } },
  });

  // Dette = Σ FUNDING − Σ REPAYMENT par compte.
  const sums = accounts.length
    ? await prisma.projectAccountMovement.groupBy({
        by: ["accountId", "type"],
        where: {
          accountId: { in: accounts.map((a) => a.id) },
          type: { in: [ProjectAccountEntryType.FUNDING, ProjectAccountEntryType.REPAYMENT] },
        },
        _sum: { amount: true },
      })
    : [];
  const funded = new Map<string, bigint>();
  const repaid = new Map<string, bigint>();
  for (const s of sums) {
    const m = s.type === ProjectAccountEntryType.FUNDING ? funded : repaid;
    m.set(s.accountId, s._sum.amount ?? 0n);
  }

  const items = accounts.map((a) => {
    const debt = (funded.get(a.id) ?? 0n) - (repaid.get(a.id) ?? 0n);
    return {
      id: a.id,
      siteId: a.siteId,
      siteCode: a.site.code,
      siteName: a.site.name,
      client: a.site.client,
      siteStatus: a.site.status,
      bankAccountId: a.bankAccountId,
      bankLabel: a.bankAccount ? `${a.bankAccount.bank} · ${a.bankAccount.accountNumber}` : null,
      balance: a.balance.toString(),
      debt: debt.toString(),
      isActive: a.isActive,
      closedAt: a.closedAt?.toISOString() ?? null,
    };
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0n);
  return NextResponse.json({
    items,
    summary: {
      count: items.length,
      totalBalance: totalBalance.toString(),
    },
    canManage: MANAGE_ROLES.includes(session.role as Role),
  });
}

// POST — ouverture d'un compte projet pour un chantier (DAF).
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const data = createProjectAccountSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const site = await prisma.site.findFirst({
      where: { id: data.siteId, tenantId: { in: scopeIds } },
      select: { id: true, tenantId: true, projectAccount: { select: { id: true } } },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
    if (site.projectAccount) {
      return NextResponse.json({ error: "Ce chantier a déjà un compte projet" }, { status: 409 });
    }

    if (data.bankAccountId) {
      const bank = await prisma.bankAccount.findFirst({
        where: { id: data.bankAccountId, tenantId: { in: scopeIds } },
        select: { id: true },
      });
      if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
    }

    const created = await prisma.projectAccount.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        bankAccountId: data.bankAccountId ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "cpt.project_account.create",
        entityType: "ProjectAccount",
        entityId: created.id,
        metadata: { siteId: site.id, bankAccountId: data.bankAccountId ?? null },
      },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/finance/project-accounts]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
