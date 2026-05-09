import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.tenantId, blocked: false },
    select: {
      id: true,
      name: true,
      category: true,
      strategic: true,
      paymentTermsContract: true,
      paymentTermsActual: true,
      financialRating: true,
      financialRatingSource: true,
      incidentsCount: true,
      volumeYTD: true,
      poCount: true,
    },
    orderBy: { volumeYTD: "desc" },
    take: 60,
  });

  const totalVolume = suppliers.reduce((s, x) => s + x.volumeYTD, 0n);

  // Encours (synthétique : 30% du volumeYTD pondéré sur délai actuel)
  const items = suppliers.map((s) => {
    const sharePercent = totalVolume === 0n ? 0 : (Number(s.volumeYTD) / Number(totalVolume)) * 100;
    const outstanding = (Number(s.volumeYTD) * Math.min(s.paymentTermsActual, 90)) / 365;
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      strategic: s.strategic,
      volumeYTD: s.volumeYTD.toString(),
      sharePercent,
      poCount: s.poCount,
      paymentTermsContract: s.paymentTermsContract,
      paymentTermsActual: s.paymentTermsActual,
      paymentDelayDelta: s.paymentTermsActual - s.paymentTermsContract,
      financialRating: s.financialRating,
      financialRatingSource: s.financialRatingSource,
      incidentsCount: s.incidentsCount,
      outstanding: Math.round(outstanding).toString(),
    };
  });

  return NextResponse.json({
    items,
    summary: {
      total: items.length,
      totalVolume: totalVolume.toString(),
      withIncidents: items.filter((i) => i.incidentsCount > 0).length,
      avgPaymentDelta:
        items.length === 0
          ? 0
          : items.reduce((s, i) => s + i.paymentDelayDelta, 0) / items.length,
    },
  });
}
