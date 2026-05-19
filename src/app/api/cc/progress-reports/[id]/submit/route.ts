import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Soumet un rapport au DTrav. Le rapport doit être en DRAFT ou REJECTED.
 * Crée également une notification pour les DTrav du tenant.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const report = await prisma.siteProgressReport.findUnique({
    where: { id },
    include: {
      site: { select: { id: true, tenantId: true, code: true, name: true } },
    },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  // RBAC périmètre site
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(report.siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Le rapport a déjà été soumis ou validé" },
      { status: 409 },
    );
  }

  const updated = await prisma.siteProgressReport.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      rejectionReason: null,
    },
    select: { id: true, status: true, submittedAt: true },
  });

  // Notifier les DTrav du même tenant
  try {
    const dtravs = await prisma.user.findMany({
      where: { tenantId: report.site.tenantId, role: Role.WORKS_DIRECTOR, status: "ACTIVE" },
      select: { id: true },
    });
    if (dtravs.length > 0) {
      await prisma.notification.createMany({
        data: dtravs.map((u) => ({
          userId: u.id,
          type: "site_report_submitted",
          title: "Nouveau rapport d'avancement à valider",
          body: `${report.site.code} — ${report.site.name}`,
          link: `/dt/rapports/${id}`,
        })),
      });
    }
  } catch (err) {
    console.warn("[submit progress-report] notification failed:", (err as Error).message);
  }

  return NextResponse.json(updated);
}
