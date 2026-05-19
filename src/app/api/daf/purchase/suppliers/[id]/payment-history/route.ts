import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  // Historique paiements réel — agrégation depuis SupplierInvoice payées
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const paidInvoices = await prisma.supplierInvoice.findMany({
    where: {
      supplierId: supplier.id,
      tenantId: session.tenantId,
      paidAt: { gte: twelveMonthsAgo },
    },
    select: { paidAt: true, dueDate: true, invoiceDate: true },
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    d.setDate(1);
    const month = d.toISOString().slice(0, 7);
    const monthInvoices = paidInvoices.filter(
      (inv) => inv.paidAt && inv.paidAt.toISOString().slice(0, 7) === month
    );
    const delays = monthInvoices
      .filter((inv) => inv.paidAt)
      .map((inv) =>
        Math.floor((inv.paidAt!.getTime() - inv.invoiceDate.getTime()) / 86_400_000)
      );
    const avgDelay = delays.length
      ? Math.round(delays.reduce((s, x) => s + x, 0) / delays.length)
      : 0;
    const latePayments = monthInvoices.filter(
      (inv) => inv.paidAt && inv.paidAt > inv.dueDate
    ).length;
    return { month, avgDelay, invoicesPaid: monthInvoices.length, latePayments };
  });

  // Incidents (DELAY/QUALITY/INVOICE_MISMATCH) — basé sur les factures DISPUTED
  // ou avec retard de paiement > 15 j. Faute de table dédiée, on les dérive.
  const disputed = await prisma.supplierInvoice.findMany({
    where: { supplierId: supplier.id, tenantId: session.tenantId, status: "DISPUTED" },
    select: { id: true, invoiceDate: true, amountTtc: true, disputeReason: true },
    take: 5,
    orderBy: { invoiceDate: "desc" },
  });
  const incidents = disputed.map((inv) => ({
    date: inv.invoiceDate.toISOString().slice(0, 10),
    type: "INVOICE_MISMATCH" as const,
    amount: inv.amountTtc.toString(),
    resolved: false,
    reason: inv.disputeReason ?? null,
  }));

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      category: supplier.category,
      paymentTermsContract: supplier.paymentTermsContract,
      paymentTermsActual: supplier.paymentTermsActual,
      financialRating: supplier.financialRating,
      financialRatingSource: supplier.financialRatingSource,
      incidentsCount: supplier.incidentsCount,
    },
    months,
    incidents,
  });
}
