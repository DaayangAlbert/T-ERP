import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.DG, Role.DAF, Role.TECH_DIRECTOR, Role.SITE_MANAGER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const items = await prisma.labTest.findMany({
    where: { siteId: site.id },
    orderBy: { expectedDate: "desc" },
    take: 30,
  });

  return NextResponse.json({
    items: items.map((t) => ({
      id: t.id,
      labName: t.labName,
      testType: t.testType,
      sampleRef: t.sampleRef,
      samplingDate: t.samplingDate.toISOString(),
      expectedDate: t.expectedDate.toISOString(),
      receivedDate: t.receivedDate?.toISOString() ?? null,
      result: t.result,
      conform: t.conform,
    })),
    pending: items.filter((t) => !t.receivedDate).length,
  });
}
