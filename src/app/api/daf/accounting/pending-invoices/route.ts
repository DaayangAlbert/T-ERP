import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { InvoiceStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT, Role.SUPER_ADMIN];

// Convention partagée avec /api/comptable/supplier-invoices :
//   "À comptabiliser" = RECEIVED + PENDING_3WAY_MATCH (cf. counts.toAccount).
// DISPUTED est suivi à part comme dans la page comptable (KPI dédié).
const TO_ACCOUNT: InvoiceStatus[] = [InvoiceStatus.RECEIVED, InvoiceStatus.PENDING_3WAY_MATCH];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  // Filtre par périmètre (chantiers accessibles) — null pour les rôles direction.
  const allowedSites = await getAccessibleSiteIds(session.sub);

  const baseWhere: Record<string, unknown> = { tenantId: session.tenantId };
  if (allowedSites !== null) baseWhere.siteId = { in: allowedSites };

  const [toAccountInvoices, disputedInvoices] = await Promise.all([
    prisma.supplierInvoice.findMany({
      where: { ...baseWhere, status: { in: TO_ACCOUNT } },
      orderBy: [{ status: "asc" }, { receivedAt: "asc" }],
      take: 100,
      include: { supplier: { select: { name: true } } },
    }),
    prisma.supplierInvoice.findMany({
      where: { ...baseWhere, status: InvoiceStatus.DISPUTED },
      orderBy: { receivedAt: "asc" },
      take: 50,
      include: { supplier: { select: { name: true } } },
    }),
  ]);

  const now = Date.now();
  const mapItem = (i: typeof toAccountInvoices[number]) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    supplier: i.supplier.name,
    invoiceDate: i.invoiceDate.toISOString(),
    dueDate: i.dueDate.toISOString(),
    amountTtc: i.amountTtc.toString(),
    status: i.status,
    receivedAt: i.receivedAt.toISOString(),
    daysWaiting: Math.floor((now - i.receivedAt.getTime()) / 86_400_000),
    disputeReason: i.disputeReason,
  });

  const items = toAccountInvoices.map(mapItem);
  const disputed = disputedInvoices.map(mapItem);

  const totalAmount = toAccountInvoices.reduce((s, i) => s + i.amountTtc, 0n);
  const disputedAmount = disputedInvoices.reduce((s, i) => s + i.amountTtc, 0n);
  const byStatus = {
    RECEIVED: toAccountInvoices.filter((i) => i.status === InvoiceStatus.RECEIVED).length,
    PENDING_3WAY_MATCH: toAccountInvoices.filter((i) => i.status === InvoiceStatus.PENDING_3WAY_MATCH).length,
  };
  const overdueCount = toAccountInvoices.filter((i) => i.dueDate.getTime() < now).length;

  return NextResponse.json({
    items,
    disputed,
    summary: {
      total: toAccountInvoices.length,
      totalAmount: totalAmount.toString(),
      byStatus,
      overdueCount,
      disputedCount: disputedInvoices.length,
      disputedAmount: disputedAmount.toString(),
    },
    scope: { isDirection: allowedSites === null },
  });
}
