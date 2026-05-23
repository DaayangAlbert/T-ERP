import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, BillingStatus, InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

// Créances clients encore à encaisser.
const RECEIVABLE_OPEN: BillingStatus[] = [
  BillingStatus.ISSUED,
  BillingStatus.PARTIALLY_PAID,
  BillingStatus.OVERDUE,
  BillingStatus.DISPUTED,
];
// Factures fournisseurs encore à payer.
const PAYABLE_OPEN: InvoiceStatus[] = [
  InvoiceStatus.RECEIVED,
  InvoiceStatus.PENDING_3WAY_MATCH,
  InvoiceStatus.ACCOUNTED,
  InvoiceStatus.PENDING_PAYMENT,
  InvoiceStatus.DISPUTED,
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();

  const [billings, invoices] = await Promise.all([
    prisma.progressBilling.findMany({
      where: { tenantId: { in: scopeIds }, status: { in: RECEIVABLE_OPEN } },
      select: { billingNumber: true, netToReceive: true, paidAmount: true, dueDate: true, status: true, site: { select: { code: true, name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.supplierInvoice.findMany({
      where: { tenantId: { in: scopeIds }, status: { in: PAYABLE_OPEN } },
      select: { invoiceNumber: true, amountTtc: true, dueDate: true, status: true, supplier: { select: { name: true } }, site: { select: { code: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  let totalAEncaisser = 0n;
  let enRetardEncaisser = 0n;
  const aEncaisser = billings.map((b) => {
    const reste = b.netToReceive - (b.paidAmount ?? 0n);
    totalAEncaisser += reste;
    const enRetard = b.dueDate < now;
    if (enRetard) enRetardEncaisser += reste;
    return {
      ref: b.billingNumber,
      client: `${b.site.code} · ${b.site.name}`,
      reste: reste.toString(),
      echeance: b.dueDate.toISOString(),
      enRetard,
    };
  });

  let totalAPayer = 0n;
  let enRetardPayer = 0n;
  const aPayer = invoices.map((i) => {
    totalAPayer += i.amountTtc;
    const enRetard = i.dueDate < now;
    if (enRetard) enRetardPayer += i.amountTtc;
    return {
      ref: i.invoiceNumber,
      fournisseur: i.supplier.name,
      chantier: i.site?.code ?? null,
      montant: i.amountTtc.toString(),
      echeance: i.dueDate.toISOString(),
      enRetard,
    };
  });

  return NextResponse.json({
    aEncaisser: {
      total: totalAEncaisser.toString(),
      enRetard: enRetardEncaisser.toString(),
      nombre: aEncaisser.length,
      items: aEncaisser,
    },
    aPayer: {
      total: totalAPayer.toString(),
      enRetard: enRetardPayer.toString(),
      nombre: aPayer.length,
      items: aPayer,
    },
    soldeNet: (totalAEncaisser - totalAPayer).toString(),
  });
}
