import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { Role, VisitorType } from "@prisma/client";

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

  const now = new Date();
  const visits = await prisma.externalVisit.findMany({
    where: { siteId: site.id },
    orderBy: { scheduledAt: "desc" },
    take: 30,
  });

  const upcoming = visits
    .filter((v) => v.status === "SCHEDULED" && v.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const recent = visits.filter((v) => v.status !== "SCHEDULED" || v.scheduledAt < now);

  return NextResponse.json({
    upcoming: upcoming.map((v) => ({
      id: v.id,
      visitorType: v.visitorType,
      visitorName: v.visitorName,
      organization: v.organization,
      scheduledAt: v.scheduledAt.toISOString(),
      purpose: v.purpose,
      hoursUntil: Math.round((v.scheduledAt.getTime() - now.getTime()) / 3_600_000),
    })),
    recent: recent.map((v) => ({
      id: v.id,
      visitorType: v.visitorType,
      visitorName: v.visitorName,
      organization: v.organization,
      scheduledAt: v.scheduledAt.toISOString(),
      completedAt: v.completedAt?.toISOString() ?? null,
      purpose: v.purpose,
      reservations: v.reservations,
      reportContent: v.reportContent,
      status: v.status,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.CDT);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    visitorType?: VisitorType;
    visitorName?: string;
    organization?: string;
    scheduledAt?: string;
    purpose?: string;
  };

  if (!body.visitorType || !body.visitorName || !body.organization || !body.scheduledAt || !body.purpose) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const site = await prisma.site.findFirst({ where: { code: "CHT-2025-031" } });
  if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const created = await prisma.externalVisit.create({
    data: {
      siteId: site.id,
      visitorType: body.visitorType,
      visitorName: body.visitorName,
      organization: body.organization,
      scheduledAt: new Date(body.scheduledAt),
      purpose: body.purpose,
      status: "SCHEDULED",
    },
  });

  return NextResponse.json({ id: created.id });
}
