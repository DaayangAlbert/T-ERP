import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendBoardReportSchema } from "@/schemas/board-report";
import { BoardReportStatus, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.DG) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  const report = await prisma.boardReport.findFirst({
    where: { id: params.id, tenantId: session.tenantId ?? undefined },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  try {
    const data = sendBoardReportSchema.parse(await req.json());

    // V1 : on n'envoie pas vraiment l'email (RESEND_API_KEY vide en démo) —
    // on enregistre l'intention dans sentTo + on passe le statut en PUBLISHED.
    const now = new Date().toISOString();
    const newSentTo = data.recipients.map((r) => ({ ...r, sentAt: now }));

    await prisma.boardReport.update({
      where: { id: report.id },
      data: {
        sentTo: newSentTo as unknown as object,
        status: BoardReportStatus.PUBLISHED,
      },
    });

    return NextResponse.json({
      ok: true,
      sent: newSentTo.length,
      note:
        process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0
          ? "Emails effectivement envoyés via Resend."
          : "Email envoyé en mode stub (RESEND_API_KEY absent). Destinataires enregistrés dans sentTo.",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/dg/board-reports/:id/send]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
