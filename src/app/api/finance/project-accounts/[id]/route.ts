import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { updateProjectAccountSchema } from "@/schemas/finance";
import { PROJECT_ENTRY_LABELS } from "@/lib/cpt/analytical";
import { Role, ProjectAccountEntryType } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];
const VIEW_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

// GET — détail + relevé des mouvements + dette.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const account = await prisma.projectAccount.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
    include: {
      site: { select: { id: true, code: true, name: true, client: true, status: true } },
      bankAccount: { select: { id: true, bank: true, accountNumber: true } },
      movements: { orderBy: { occurredAt: "desc" }, take: 100 },
    },
  });
  if (!account) return NextResponse.json({ error: "Compte projet introuvable" }, { status: 404 });

  const allowedSites = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowedSites, account.siteId)) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  let funded = 0n;
  let repaid = 0n;
  for (const m of account.movements) {
    if (m.type === ProjectAccountEntryType.FUNDING) funded += m.amount;
    if (m.type === ProjectAccountEntryType.REPAYMENT) repaid += m.amount;
  }

  return NextResponse.json({
    id: account.id,
    siteId: account.siteId,
    siteCode: account.site.code,
    siteName: account.site.name,
    client: account.site.client,
    siteStatus: account.site.status,
    bankAccountId: account.bankAccountId,
    bankLabel: account.bankAccount ? `${account.bankAccount.bank} · ${account.bankAccount.accountNumber}` : null,
    balance: account.balance.toString(),
    debt: (funded - repaid).toString(),
    isActive: account.isActive,
    closedAt: account.closedAt?.toISOString() ?? null,
    movements: account.movements.map((m) => ({
      id: m.id,
      type: m.type,
      typeLabel: PROJECT_ENTRY_LABELS[m.type],
      direction: m.direction,
      amount: m.amount.toString(),
      reason: m.reason,
      reference: m.reference,
      balanceAfter: m.balanceAfter.toString(),
      occurredAt: m.occurredAt.toISOString(),
    })),
  });
}

// PATCH — rattacher/changer le compte bancaire ; clôturer / rouvrir.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  try {
    const data = updateProjectAccountSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const account = await prisma.projectAccount.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
      select: { id: true },
    });
    if (!account) return NextResponse.json({ error: "Compte projet introuvable" }, { status: 404 });

    if (data.bankAccountId) {
      const bank = await prisma.bankAccount.findFirst({
        where: { id: data.bankAccountId, tenantId: { in: scopeIds } },
        select: { id: true },
      });
      if (!bank) return NextResponse.json({ error: "Compte bancaire introuvable" }, { status: 404 });
    }

    await prisma.projectAccount.update({
      where: { id: account.id },
      data: {
        ...(data.bankAccountId !== undefined ? { bankAccountId: data.bankAccountId } : {}),
        ...(data.isActive !== undefined
          ? { isActive: data.isActive, closedAt: data.isActive ? null : new Date() }
          : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/finance/project-accounts/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
