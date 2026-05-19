import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.TECH_DIRECTOR) {
    return NextResponse.json({ error: "Réservé Directeur Technique" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.dtMonthlyTechReport.findUnique({
    where: { id },
    include: { _count: { select: { sites: true } } },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.authorId !== session.sub) {
    return NextResponse.json({ error: "Soumission réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Statut incompatible" }, { status: 409 });
  }
  if (report._count.sites === 0) {
    return NextResponse.json({ error: "Au moins un chantier requis" }, { status: 400 });
  }

  const dgs = await prisma.user.findMany({
    where: { tenantId: report.tenantId, role: Role.DG },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.dtMonthlyTechReport.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
    });

    if (dgs.length > 0) {
      await tx.notification.createMany({
        data: dgs.map((dg) => ({
          userId: dg.id,
          type: "validation_required",
          title: "Rapport mensuel technique à valider",
          body: "Le Directeur Technique a soumis le rapport mensuel pour validation.",
          link: `/direction-generale/rapports-dt`,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
