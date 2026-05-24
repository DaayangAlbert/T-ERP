import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, MeetingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Rappels quotidiens du Propriétaire / PCA.
 *
 * À appeler une fois par jour (cron VPS) :
 *   curl -H "x-cron-secret: $CRON_SECRET" https://<host>/api/cron/owner-reminders
 *
 * Notifie chaque PCA des réunions de conseil/AG dans les 3 prochains jours,
 * et des décisions transmises par le DG en attente. Anti-doublon : pas plus
 * d'un rappel par réunion et par jour.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86_400_000);
  const dayAgo = new Date(now.getTime() - 20 * 3_600_000);

  const meetings = await prisma.governanceMeeting.findMany({
    where: { scheduledAt: { gte: now, lte: in3Days }, status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.POSTPONED] } },
    select: { id: true, tenantId: true, type: true, scheduledAt: true, location: true },
  });

  let sent = 0;
  for (const m of meetings) {
    const owners = await prisma.user.findMany({
      where: { tenantId: m.tenantId, role: Role.OWNER, status: "ACTIVE" },
      select: { id: true },
    });
    const jours = Math.ceil((m.scheduledAt.getTime() - now.getTime()) / 86_400_000);
    const link = `/proprietaire/reunions?m=${m.id}`;
    for (const o of owners) {
      const already = await prisma.notification.findFirst({
        where: { userId: o.id, type: "board_meeting_reminder", link, createdAt: { gte: dayAgo } },
        select: { id: true },
      });
      if (already) continue;
      await prisma.notification.create({
        data: {
          userId: o.id,
          type: "board_meeting_reminder",
          title: jours <= 0 ? "Réunion du conseil aujourd'hui" : jours === 1 ? "Réunion du conseil demain" : `Réunion du conseil dans ${jours} jours`,
          body: `Réunion de gouvernance prévue le ${m.scheduledAt.toLocaleDateString("fr-FR")} à ${m.location}.`,
          link,
        },
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, meetings: meetings.length, notificationsSent: sent });
}
