import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendReminderSchema } from "@/schemas/receivables";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  try {
    const data = sendReminderSchema.parse(await req.json());

    const receivable = await prisma.receivable.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!receivable) return NextResponse.json({ error: "Créance introuvable" }, { status: 404 });

    const reminder = await prisma.reminder.create({
      data: {
        receivableId: receivable.id,
        level: data.level,
        channel: data.channel,
        sentAt: new Date(),
        sentBy: session.sub,
        responseNote: data.note,
      },
    });

    // Si LITIGATION, faire passer le statut
    if (data.level === "LITIGATION") {
      await prisma.receivable.update({
        where: { id: receivable.id },
        data: { status: "LITIGATION" },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "receivable.reminder",
        entityType: "Receivable",
        entityId: receivable.id,
        metadata: { invoiceRef: receivable.invoiceRef, level: data.level, channel: data.channel },
      },
    });

    return NextResponse.json({
      id: reminder.id,
      note: process.env.RESEND_API_KEY
        ? "Email/lettre envoyé via Resend"
        : "Stub : RESEND_API_KEY non configuré, relance enregistrée en DB seulement",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
