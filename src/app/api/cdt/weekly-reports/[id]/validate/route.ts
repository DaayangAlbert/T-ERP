import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.WORKS_DIRECTOR && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Directeur de Travaux" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.cdtWeeklyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (report.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Rapport non soumis (statut " + report.status + ")" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.cdtWeeklyReport.update({
      where: { id },
      data: {
        status: "VALIDATED",
        validatedById: session.sub,
        validatedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.notification.create({
      data: {
        userId: report.authorId,
        type: "report_validated",
        title: "Votre rapport hebdomadaire est validé",
        body: "Le DTrav a validé votre rapport.",
        link: `/conducteur-travaux/rapports/${id}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
