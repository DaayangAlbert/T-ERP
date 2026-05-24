import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const OPEN: InvoiceStatus[] = [
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
  const [suppliers, owedRows] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId: { in: scopeIds } },
      select: {
        id: true, name: true, category: true, city: true, phone: true, email: true,
        ratingQuality: true, ratingDelay: true, ratingPrice: true, volumeYTD: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.supplierInvoice.groupBy({
      by: ["supplierId"],
      where: { tenantId: { in: scopeIds }, status: { in: OPEN } },
      _sum: { amountTtc: true },
      _count: { _all: true },
    }),
  ]);

  const owed = new Map<string, { montant: bigint; nb: number }>();
  for (const r of owedRows) owed.set(r.supplierId, { montant: r._sum.amountTtc ?? 0n, nb: r._count._all });

  const avg = (a: number | null, b: number | null, c: number | null) => {
    const vals = [a, b, c].filter((x): x is number => x != null);
    return vals.length ? Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10 : null;
  };

  let totalDu = 0n;
  const items = suppliers.map((s) => {
    const o = owed.get(s.id);
    if (o) totalDu += o.montant;
    return {
      id: s.id,
      nom: s.name,
      categorie: s.category,
      ville: s.city,
      contact: s.phone ?? s.email ?? null,
      note: avg(s.ratingQuality, s.ratingDelay, s.ratingPrice),
      volumeAnnee: s.volumeYTD.toString(),
      duMontant: (o?.montant ?? 0n).toString(),
      duFactures: o?.nb ?? 0,
    };
  });

  // Répartition par catégorie.
  const catMap = new Map<string, number>();
  for (const s of suppliers) catMap.set(s.category, (catMap.get(s.category) ?? 0) + 1);
  const categories = Array.from(catMap.entries()).map(([cat, n]) => ({ categorie: cat, nombre: n })).sort((a, b) => b.nombre - a.nombre);

  return NextResponse.json({
    resume: { total: items.length, totalDu: totalDu.toString(), avecDette: items.filter((i) => BigInt(i.duMontant) > 0n).length },
    categories,
    items,
  });
}
