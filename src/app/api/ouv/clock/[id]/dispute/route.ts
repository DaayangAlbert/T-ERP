import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { disputeSchema } from "@/schemas/ouv-clock";

export const dynamic = "force-dynamic";

// POST /api/ouv/clock/:id/dispute
// Ouvrier conteste les heures pointées (par lui-même ou modifiées par CC).
// Délai 48h après le pointage. Trace contestedAt + contestReason ; le CC
// traite ensuite la contestation (resolvedAt / resolvedBy) côté espace CC.
const DISPUTE_WINDOW_HOURS = 48;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = disputeSchema.parse(body);

    const tr = await prisma.timeReport.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        date: true,
        arrivalTime: true,
        contestedAt: true,
      },
    });
    if (!tr) return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });
    if (tr.userId !== session.sub) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Fenêtre de contestation : 48h après la date du pointage
    const ageMs = Date.now() - tr.date.getTime();
    if (ageMs > DISPUTE_WINDOW_HOURS * 3_600_000) {
      return NextResponse.json(
        {
          error: `Délai de contestation dépassé (${DISPUTE_WINDOW_HOURS}h)`,
          code: "DISPUTE_WINDOW_EXPIRED",
        },
        { status: 409 }
      );
    }

    if (tr.contestedAt) {
      return NextResponse.json(
        { error: "Une contestation est déjà en cours sur ce pointage" },
        { status: 409 }
      );
    }

    const updated = await prisma.timeReport.update({
      where: { id: tr.id },
      data: {
        contestedAt: new Date(),
        contestReason: input.reason,
      },
      select: {
        id: true,
        date: true,
        contestedAt: true,
        contestReason: true,
      },
    });

    // TODO fn 1.6 : notification WhatsApp au CC (Jean KAMGA) + DTrav si pas
    // de réponse 24h après. Trace audit également (cf src/lib/audit).

    return NextResponse.json({
      timeReport: {
        id: updated.id,
        date: updated.date.toISOString(),
        contestedAt: updated.contestedAt?.toISOString() ?? null,
        contestReason: updated.contestReason,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/clock/:id/dispute]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
