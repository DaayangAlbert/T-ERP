import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { epiReplacementSchema } from "@/schemas/ouv-profile";
import { EpiStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/epi/replacement-request { epiId, reason }
// L'ouvrier signale qu'un EPI est usé / défectueux. Bascule en WORN_OUT
// avec replacementReason. Le magasinier (Lucas TIENTCHEU) traite ensuite
// la demande depuis son espace MAG.
export async function POST(req: Request) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = epiReplacementSchema.parse(body);

    const epi = await prisma.epiAssignment.findFirst({
      where: { id: input.epiId, userId: session.sub },
      select: { id: true, status: true, name: true },
    });
    if (!epi) return NextResponse.json({ error: "EPI introuvable" }, { status: 404 });
    if (epi.status === EpiStatus.REPLACED || epi.status === EpiStatus.LOST) {
      return NextResponse.json(
        { error: "Cet EPI a déjà été remplacé ou déclaré perdu", code: "ALREADY_HANDLED" },
        { status: 409 }
      );
    }

    await prisma.epiAssignment.update({
      where: { id: epi.id },
      data: { status: EpiStatus.WORN_OUT, replacementReason: input.reason },
    });

    // TODO fn 1.6 / intégration WA : notif Magasinier (Lucas) +
    // notif RH si EPI critique (casque, harnais).

    return NextResponse.json({
      ok: true,
      message: `Demande envoyée — ${epi.name} sera remplacé par le magasinier`,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/epi/replacement-request]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
