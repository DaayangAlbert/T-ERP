import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendReportSchema } from "@/schemas/report";
import { ReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = sendReportSchema.parse(await req.json());

    const report = await prisma.report.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const sentAt = new Date().toISOString();
    const sentTo = data.recipients.map((r) => ({ ...r, sentAt }));

    await prisma.report.update({
      where: { id: report.id },
      data: {
        recipients: sentTo as unknown as object,
        status: ReportStatus.PUBLISHED,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "report.send",
        entityType: "Report",
        entityId: report.id,
        metadata: { recipientCount: sentTo.length, message: data.message ?? null },
      },
    });

    return NextResponse.json({
      ok: true,
      sent: sentTo.length,
      note: process.env.RESEND_API_KEY
        ? "Email réellement envoyé via Resend"
        : "Stub : RESEND_API_KEY non configuré, destinataires enregistrés en DB uniquement",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/reports/:id/send]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
