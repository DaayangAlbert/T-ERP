import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { hseAddInfoSchema } from "@/schemas/ouv-hse";
import { HseIncidentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/hse/reports/:id/add-info { additionalInfo }
// L'ouvrier ajoute des infos après coup. Concat datée dans description
// pour préserver l'historique simple. Trace audit via updatedAt.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = hseAddInfoSchema.parse(body);

    const r = await prisma.hseIncidentReport.findFirst({
      where: { id: ctx.params.id, reportedById: session.sub },
      select: { id: true, status: true, description: true },
    });
    if (!r) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
    if (r.status === HseIncidentStatus.CLOSED) {
      return NextResponse.json(
        { error: "Signalement clôturé — impossible d'ajouter des infos", code: "CLOSED" },
        { status: 409 }
      );
    }

    const dateStamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const newEntry = `\n\n--- AJOUT DU ${dateStamp} ---\n${input.additionalInfo}`;

    await prisma.hseIncidentReport.update({
      where: { id: r.id },
      data: { description: r.description + newEntry },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/hse/reports/:id/add-info]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
