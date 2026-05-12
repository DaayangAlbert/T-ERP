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

  const milestones = await prisma.cdtMilestone.findMany({
    where: { siteId: site.id },
    orderBy: { contractDate: "asc" },
  });

  const now = Date.now();
  const reached = milestones.filter((m) => m.status === "REACHED");
  const next = milestones.find((m) => m.status !== "REACHED");
  const daysToNext = next ? Math.ceil((next.contractDate.getTime() - now) / 86_400_000) : null;
  const openReservations = milestones.reduce((s, m) => s + m.reservations, 0);

  return NextResponse.json({
    items: milestones.map((m) => ({
      id: m.id,
      code: m.code,
      designation: m.designation,
      contractDate: m.contractDate.toISOString(),
      forecastDate: m.forecastDate.toISOString(),
      actualDate: m.actualDate?.toISOString() ?? null,
      status: m.status,
      deliverables: m.deliverables,
      preparation: m.preparation,
      reservations: m.reservations,
    })),
    kpis: {
      reached: reached.length,
      total: milestones.length,
      nextCode: next?.code ?? null,
      daysToNext,
      openReservations,
      onTime: daysToNext === null || daysToNext > 0,
    },
  });
}
