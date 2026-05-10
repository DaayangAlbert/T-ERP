import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.TENANT_ADMIN];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  const site = await prisma.site.findUnique({
    where: { id: params.id },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true } },
      contract: true,
      alerts: {
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      photos: { orderBy: { takenAt: "desc" }, take: 6 },
      decisions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    id: site.id,
    code: site.code,
    name: site.name,
    client: site.client,
    moaName: site.moaName,
    moaTypeKind: site.moaTypeKind,
    contractTypeKind: site.contractTypeKind,
    type: site.type,
    region: site.region,
    budget: Number(site.budget),
    actualSpent: Number(site.actualSpentAmount),
    physicalProgress: site.physicalProgress,
    financialProgress: site.financialProgress,
    deviationPercent: site.deviationPercent,
    margin: site.margin,
    marginTarget: site.marginTarget,
    status: site.status,
    startDate: site.startDate.toISOString(),
    plannedEndDate: site.plannedEndDate.toISOString(),
    actualEndDate: site.actualEndDate?.toISOString() ?? null,
    manager: site.manager
      ? {
          id: site.manager.id,
          name: `${site.manager.firstName} ${site.manager.lastName}`,
        }
      : null,
    contract: site.contract
      ? {
          reference: site.contract.reference,
          initialAmount: Number(site.contract.initialAmount),
          currentAmount: Number(site.contract.currentAmount),
          publicMarket: site.contract.publicMarket,
          procuringEntity: site.contract.procuringEntity,
          signedAt: site.contract.signedAt?.toISOString() ?? null,
        }
      : null,
    alerts: site.alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
    photos: site.photos.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      takenAt: p.takenAt.toISOString(),
    })),
    decisions: site.decisions.map((d) => ({
      id: d.id,
      title: d.title,
      body: d.body,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
