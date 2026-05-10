import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, DepartureType, DepartureStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const TYPE_LABEL: Record<DepartureType, string> = {
  RESIGNATION: "Démission",
  DISMISSAL_INDIVIDUAL: "Licenciement",
  DISMISSAL_ECONOMIC: "Licenciement économique",
  RETIREMENT: "Départ retraite",
  END_OF_CONTRACT: "Fin de CDD",
  NEGOTIATED: "Rupture conventionnelle",
};

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const since = new Date(Date.now() - 24 * 30 * 86_400_000);
  const items = await prisma.employeeDeparture.findMany({
    where: { tenantId: session.tenantId, departureDate: { gte: since } },
    orderBy: { departureDate: "desc" },
    take: 60,
  });

  const provisioned = items.filter((d) => d.status === DepartureStatus.PROVISIONED);
  const totalProvision = provisioned.reduce((s, d) => s + d.totalCost, 0n);

  const totalCost = items.reduce((s, d) => s + d.totalCost, 0n);
  const avgCost = items.length === 0 ? 0n : totalCost / BigInt(items.length);

  const byType = Object.values(DepartureType).map((t) => {
    const subset = items.filter((d) => d.departureType === t);
    return {
      type: t,
      label: TYPE_LABEL[t],
      count: subset.length,
      total: subset.reduce((s, d) => s + d.totalCost, 0n).toString(),
    };
  });

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      employeeName: d.employeeName,
      position: d.position,
      type: d.departureType,
      typeLabel: TYPE_LABEL[d.departureType],
      departureDate: d.departureDate.toISOString(),
      severancePay: d.severancePay.toString(),
      unusedLeavePay: d.unusedLeavePay.toString(),
      bonusProrata: d.bonusProrata.toString(),
      totalCost: d.totalCost.toString(),
      status: d.status,
    })),
    summary: {
      total: items.length,
      provisionedCount: provisioned.length,
      totalProvisionAmount: totalProvision.toString(),
      avgCost: avgCost.toString(),
      totalCost: totalCost.toString(),
      byType,
    },
  });
}
