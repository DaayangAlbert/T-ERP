import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.WORKS_MANAGER) {
    return NextResponse.json({ error: "Réservé Conducteur de Travaux" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.cdtWeeklyReport.findUnique({
    where: { id },
    include: { _count: { select: { sites: true } } },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.authorId !== session.sub) {
    return NextResponse.json({ error: "Soumission réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Statut incompatible : " + report.status }, { status: 409 });
  }
  if (report._count.sites === 0) {
    return NextResponse.json(
      { error: "Au moins un chantier doit être renseigné avant soumission" },
      { status: 400 },
    );
  }

  // Trouver les DTrav du tenant pour notification
  const dtravs = await prisma.user.findMany({
    where: { tenantId: report.tenantId, role: Role.WORKS_DIRECTOR },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.cdtWeeklyReport.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    if (dtravs.length > 0) {
      await tx.notification.createMany({
        data: dtravs.map((dt) => ({
          userId: dt.id,
          type: "validation_required",
          title: "Rapport hebdomadaire CDT à valider",
          body: `Un rapport hebdomadaire CDT vous a été soumis pour validation.`,
          link: `/directeur-travaux/validations`,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
