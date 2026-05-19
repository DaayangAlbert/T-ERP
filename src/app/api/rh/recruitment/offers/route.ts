/**
 * Liste des offres actives — lecture depuis la BDD avec count des candidatures.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const offers = await prisma.jobOffer.findMany({
    where: { tenantId: session.tenantId, status: "PUBLISHED" },
    select: {
      reference: true,
      title: true,
      department: true,
      contractType: true,
      category: true,
      positions: true,
      region: true,
      status: true,
      publishedAt: true,
      _count: { select: { applications: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json({
    items: offers.map((o) => ({
      reference: o.reference,
      title: o.title,
      department: o.department ?? "—",
      contractType: o.contractType,
      category: o.category,
      positions: o.positions,
      region: o.region ?? "—",
      status: o.status,
      publishedAt: o.publishedAt?.toISOString().slice(0, 10) ?? null,
      applicationsCount: o._count.applications,
    })),
  });
}
