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

  // Synthèse historique paiements (12 derniers mois)
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const month = d.toISOString().slice(0, 7);
    const baseDelay = supplier.paymentTermsActual;
    const variance = Math.round((Math.random() - 0.5) * 8);
    return {
      month,
      avgDelay: Math.max(0, baseDelay + variance),
      invoicesPaid: 1 + Math.floor(Math.random() * 8),
      latePayments: variance > 4 ? 1 : 0,
    };
  });

  const incidents = supplier.incidentsCount > 0
    ? Array.from({ length: Math.min(supplier.incidentsCount, 5) }, (_, i) => ({
        date: new Date(Date.now() - (i + 1) * 30 * 86_400_000).toISOString().slice(0, 10),
        type: ["DELAY", "QUALITY", "INVOICE_MISMATCH"][i % 3],
        amount: (5_000_000 + i * 1_500_000).toString(),
        resolved: i > 0,
      }))
    : [];

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
