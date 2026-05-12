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

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const presencesToday = await prisma.subcontractorPresence.findMany({
    where: { siteId: site.id, date: todayMidnight },
    include: { subcontractor: true },
  });

  // Active = présent aujourd'hui, à venir = mappé statique
  return NextResponse.json({
    active: presencesToday.map((p) => ({
      id: p.id,
      subcontractorId: p.subcontractorId,
      name: p.subcontractor.name,
      contractLabel: "Étanchéité tablier + chape protection",
      workerCount: p.workerCount,
      headcountTarget: 6,
      supervisor: p.supervisorOnSite,
      activityNotes: p.activityNotes,
      progress: 28,
      startedAt: "2026-05-05",
      endDate: "2026-05-28",
      totalAmount: 38_200_000,
      qualityRating: 4.5,
    })),
    upcoming: [
      {
        id: "upcoming-elec",
        name: "ELEC Cameroun",
        contractLabel: "Réseaux électriques voirie + éclairage public",
        startsAt: "2026-05-20",
        durationDays: 18,
        totalAmount: 12_400_000,
      },
    ],
    totalEngagedAmount: 50_600_000,
  });
}
