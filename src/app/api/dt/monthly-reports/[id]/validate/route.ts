import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Générale" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.dtMonthlyTechReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (report.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Rapport non soumis" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.dtMonthlyTechReport.update({
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
        title: "Votre rapport mensuel technique est validé",
        body: "Le DG a validé votre rapport mensuel.",
        link: `/direction-technique/rapports/${id}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
