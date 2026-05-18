import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DAF) {
    return NextResponse.json({ error: "Réservé Directeur Administratif et Financier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.dafMonthlyFinancialReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.authorId !== session.sub) {
    return NextResponse.json({ error: "Soumission réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Statut incompatible" }, { status: 409 });
  }

  // Garde-fou minimal : exiger une synthèse exécutive avant soumission
  if (!report.executiveSummary || report.executiveSummary.trim().length < 10) {
    return NextResponse.json(
      { error: "Synthèse exécutive requise (minimum 10 caractères)" },
      { status: 400 },
    );
  }

  const dgs = await prisma.user.findMany({
    where: { tenantId: report.tenantId, role: Role.DG },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.dafMonthlyFinancialReport.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
    });

    if (dgs.length > 0) {
      await tx.notification.createMany({
        data: dgs.map((dg) => ({
          userId: dg.id,
          type: "validation_required",
          title: "Rapport financier mensuel à valider",
          body: "Le DAF a soumis le rapport financier mensuel pour validation.",
          link: `/direction-generale/rapports-daf`,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
