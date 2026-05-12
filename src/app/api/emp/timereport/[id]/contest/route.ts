import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

const CONTEST_WINDOW_HOURS = 48;

/**
 * Contestation par l'employé de son propre pointage.
 *
 * - Ownership strict : `report.userId === session.sub`.
 * - Une seule contestation par pointage (409 sinon).
 * - Fenêtre 48 h après la date du pointage (422 sinon).
 * - À la création : notification persistée au pointeur (CC) pour que
 *   son tableau de bord remonte le différend. Pas de template WhatsApp
 *   dédié pour l'instant (les 7 templates approuvés Meta ne couvrent pas
 *   ce cas — à ajouter ultérieurement comme `TIME_DISPUTE_RAISED`).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = (await req.json().catch(() => ({}))) as { kind?: string; expectedTime?: string; reason?: string };
  if (!body.reason || body.reason.trim().length < 5) {
    return NextResponse.json({ error: "Justification requise (5+ caractères)" }, { status: 400 });
  }

  const report = await prisma.timeReport.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, date: true, contestedAt: true, pointedBy: true },
  });
  if (!report) return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });
  if (report.userId !== session.sub) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  if (report.contestedAt) return NextResponse.json({ error: "Pointage déjà contesté" }, { status: 409 });

  const hoursSince = (Date.now() - report.date.getTime()) / 3600_000;
  if (hoursSince > CONTEST_WINDOW_HOURS) {
    return NextResponse.json({ error: `Délai dépassé : signalement possible sous ${CONTEST_WINDOW_HOURS}h` }, { status: 422 });
  }

  await prisma.timeReport.update({
    where: { id: params.id },
    data: {
      contestedAt: new Date(),
      contestReason: `[${body.kind ?? "OTHER"}] heure attendue ${body.expectedTime ?? "—"} · ${body.reason}`,
    },
  });

  // Notification au pointeur (typiquement le CC) si pertinent — auto-évite
  // l'auto-notification si le pointage avait été enregistré par l'utilisateur
  // lui-même (cas seed placeholder).
  if (report.pointedBy && report.pointedBy !== report.userId) {
    const requester = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true },
    });
    const dateLabel = report.date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
    await prisma.notification.create({
      data: {
        userId: report.pointedBy,
        type: "time_dispute_raised",
        title: "Contestation pointage",
        body: `${requester?.firstName ?? "Un ouvrier"} ${requester?.lastName ?? ""} conteste le pointage du ${dateLabel}. Motif : ${body.reason}`.trim(),
        link: `/cc/pointage?dispute=${params.id}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
