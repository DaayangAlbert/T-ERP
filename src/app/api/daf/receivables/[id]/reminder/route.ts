import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendReminderSchema } from "@/schemas/receivables";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT];

const LEVEL_LABEL: Record<string, string> = {
  R1_AMIABLE: "R1 Amiable",
  R2_FIRM: "R2 Ferme",
  R3_FORMAL_NOTICE: "R3 Mise en demeure",
  LITIGATION: "Contentieux",
};

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "Email",
  LETTER: "Lettre simple",
  REGISTERED_MAIL: "LR/AR",
  PHONE: "Téléphone",
  BAILIFF: "Huissier",
};

function fmtFCFA(amount: bigint): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

/**
 * Workflow interne d'escalade des relances.
 *
 * Le DAF (ou un comptable) déclare un nouveau niveau de relance. Cela :
 *   1) crée un Reminder en DB (trace du niveau atteint, canal préconisé)
 *   2) passe la créance en LITIGATION si niveau = LITIGATION
 *   3) notifie in-app le comptable du tenant qui exécutera réellement
 *      la relance (envoi mail, impression LR, appel téléphonique).
 *
 * Aucun envoi externe vers le client n'est effectué ici. L'exécution est
 * la responsabilité de l'agent recouvrement assigné.
 */
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

    if (data.level === "LITIGATION") {
      await prisma.receivable.update({
        where: { id: receivable.id },
        data: { status: "LITIGATION" },
      });
    }

    // Notification au comptable du tenant (responsable du suivi recouvrement
    // par défaut). Si plusieurs comptables, on notifie le premier ACTIVE.
    const accountant = await prisma.user.findFirst({
      where: { tenantId: session.tenantId, role: Role.ACCOUNTANT, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
    });

    let notifiedTo: string | null = null;
    if (accountant && accountant.id !== session.sub) {
      const levelLbl = LEVEL_LABEL[data.level] ?? data.level;
      const channelLbl = CHANNEL_LABEL[data.channel] ?? data.channel;
      await prisma.notification.create({
        data: {
          userId: accountant.id,
          type: "receivable_reminder_escalated",
          title: `Relance ${levelLbl} à exécuter`,
          body: `${receivable.clientName} · ${receivable.invoiceRef} · ${fmtFCFA(receivable.amount)} · Canal préconisé : ${channelLbl}`,
          link: "/direction-financiere/recouvrement",
        },
      });
      notifiedTo = `${accountant.firstName} ${accountant.lastName}`;
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "receivable.reminder.escalated",
        entityType: "Receivable",
        entityId: receivable.id,
        metadata: {
          invoiceRef: receivable.invoiceRef,
          level: data.level,
          channel: data.channel,
          notifiedTo: accountant?.id ?? null,
        },
      },
    });

    return NextResponse.json({
      id: reminder.id,
      level: data.level,
      note: notifiedTo
        ? `Niveau ${LEVEL_LABEL[data.level] ?? data.level} enregistré. ${notifiedTo} a été notifié(e) pour exécution.`
        : `Niveau ${LEVEL_LABEL[data.level] ?? data.level} enregistré. Aucun comptable actif à notifier — exécution à organiser manuellement.`,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
