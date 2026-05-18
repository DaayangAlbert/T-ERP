import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { rejectDafMonthlyReportSchema } from "@/schemas/daf-monthly-report";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG && session.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Générale" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.dafMonthlyFinancialReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (report.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Rapport non soumis" }, { status: 409 });
  }

  try {
    const body = rejectDafMonthlyReportSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.dafMonthlyFinancialReport.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: body.reason,
          validatedById: session.sub,
          validatedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: report.authorId,
          type: "report_rejected",
          title: "Votre rapport financier mensuel est refusé",
          body: body.reason,
          link: `/direction-financiere/rapports-mensuels/${id}`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Motif invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/daf/monthly-reports/:id/reject]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
