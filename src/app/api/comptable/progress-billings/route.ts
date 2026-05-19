import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { Role, BillingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

// Constantes Cameroun
const VAT_RATE = 0.1925; // 19,25%
const GUARANTEE_RATE = 0.05; // 5% retenue de garantie
const SOURCE_RATE = 0.022; // 2,2% retenue à la source

const itemSchema = z.object({
  bpuCode: z.string(),
  designation: z.string(),
  unit: z.string(),
  cumQty: z.coerce.number().nonnegative(),
  prevCumQty: z.coerce.number().nonnegative().default(0),
  unitPrice: z.coerce.number().nonnegative(),
});

const createSchema = z.object({
  siteId: z.string(),
  period: z.string(), // YYYY-MM
  items: z.array(itemSchema).min(1),
  dueDate: z.string(),
});

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowed !== null) where.siteId = { in: allowed };

  const items = await prisma.progressBilling.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { site: { select: { code: true, name: true, client: true } } },
  });

  // OVERDUE est calculé à la volée : une situation ISSUED dont la dueDate est
  // passée bascule visuellement en OVERDUE. Le statut DB reste ISSUED tant
  // qu'aucun job de bascule n'est branché.
  const now = Date.now();
  const effectiveStatus = (b: typeof items[number]): string => {
    if (b.status === BillingStatus.ISSUED && b.dueDate.getTime() < now) return "OVERDUE";
    return b.status;
  };

  return NextResponse.json({
    items: items.map((b) => ({
      id: b.id,
      billingNumber: b.billingNumber,
      period: b.period,
      siteCode: b.site.code,
      siteName: b.site.name,
      client: b.site.client,
      amountHt: Number(b.amountHt),
      vatAmount: Number(b.vatAmount),
      amountTtc: Number(b.amountTtc),
      guaranteeRetention: Number(b.guaranteeRetention),
      sourceWithholding: Number(b.sourceWithholding),
      netToReceive: Number(b.netToReceive),
      paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
      dueDate: b.dueDate.toISOString(),
      paidAt: b.paidAt?.toISOString() ?? null,
      status: effectiveStatus(b),
    })),
    counts: {
      toIssue: items.filter((b) => b.status === "DRAFT" || b.status === "VALIDATED").length,
      issued: items.filter((b) => effectiveStatus(b) === "ISSUED").length,
      paid: items.filter((b) => b.status === "PAID" || b.status === "PARTIALLY_PAID").length,
      overdue: items.filter((b) => effectiveStatus(b) === "OVERDUE").length,
    },
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

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowed, parsed.data.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  const items = parsed.data.items.map((it) => {
    const periodQty = it.cumQty - it.prevCumQty;
    return {
      ...it,
      periodQty,
      total: Math.round(periodQty * it.unitPrice),
    };
  });

  const amountHt = items.reduce((s, x) => s + x.total, 0);
  const vatAmount = Math.round(amountHt * VAT_RATE);
  const amountTtc = amountHt + vatAmount;
  const guarantee = Math.round(amountHt * GUARANTEE_RATE);
  const source = Math.round(amountHt * SOURCE_RATE);
  const netToReceive = amountTtc - guarantee - source;

  const count = await prisma.progressBilling.count({ where: { tenantId: session.tenantId } });
  const billingNumber = `S${String(count + 1).padStart(4, "0")}-${parsed.data.period}`;

  const created = await prisma.progressBilling.create({
    data: {
      tenantId: session.tenantId,
      siteId: parsed.data.siteId,
      billingNumber,
      period: parsed.data.period,
      amountHt: BigInt(amountHt),
      vatAmount: BigInt(vatAmount),
      amountTtc: BigInt(amountTtc),
      guaranteeRetention: BigInt(guarantee),
      sourceWithholding: BigInt(source),
      netToReceive: BigInt(netToReceive),
      dueDate: new Date(parsed.data.dueDate),
      items: items as unknown as object[],
      status: BillingStatus.DRAFT,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "progress-billing.create",
      entityType: "ProgressBilling",
      entityId: created.id,
      metadata: { siteId: parsed.data.siteId, period: parsed.data.period, amountTtc, netToReceive },
    },
  });

  return NextResponse.json({ id: created.id, billingNumber, amountTtc, netToReceive }, { status: 201 });
}
