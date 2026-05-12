import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.SITE_MANAGER, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé CDT/CC" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    subcontractorId?: string;
    workerCount?: number;
    supervisorOnSite?: string;
    activityNotes?: string;
  };

  if (!body.subcontractorId || !body.supervisorOnSite || body.workerCount == null) {
    return NextResponse.json({ error: "Données pointage incomplètes" }, { status: 400 });
  }

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  await prisma.subcontractorPresence.upsert({
    where: { siteId_subcontractorId_date: { siteId: site.id, subcontractorId: body.subcontractorId, date: todayMidnight } },
    update: {
      workerCount: body.workerCount,
      supervisorOnSite: body.supervisorOnSite,
      activityNotes: body.activityNotes ?? null,
      recordedBy: session.sub,
    },
    create: {
      siteId: site.id,
      subcontractorId: body.subcontractorId,
      date: todayMidnight,
      workerCount: body.workerCount,
      supervisorOnSite: body.supervisorOnSite,
      activityNotes: body.activityNotes ?? null,
      recordedBy: session.sub,
    },
  });

  return NextResponse.json({ ok: true });
}
