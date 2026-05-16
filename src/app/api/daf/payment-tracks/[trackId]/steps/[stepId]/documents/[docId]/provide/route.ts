import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { provideDocumentSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

/**
 * Marque un document demandé comme fourni. Toggle (refournir le même → toggle false).
 */
export async function POST(
  req: Request,
  { params }: { params: { trackId: string; stepId: string; docId: string } },
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = provideDocumentSchema.parse(await req.json().catch(() => ({})));

    const track = await prisma.paymentTrack.findFirst({
      where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
    });
    if (!track) return NextResponse.json({ error: "Track introuvable" }, { status: 404 });

    const isDafOrAdmin = session.role === Role.DAF || session.role === Role.TENANT_ADMIN;
    const isAssignee = track.assignedToId === session.sub;
    if (!isDafOrAdmin && !isAssignee) {
      return NextResponse.json({ error: "Réservé DAF ou personne assignée" }, { status: 403 });
    }

    const doc = await prisma.paymentTrackStepDocument.findFirst({
      where: { id: params.docId, stepId: params.stepId, step: { trackId: track.id } },
    });
    if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

    const newProvided = !doc.provided;
    await prisma.paymentTrackStepDocument.update({
      where: { id: doc.id },
      data: {
        provided: newProvided,
        providedAt: newProvided ? new Date() : null,
        providedById: newProvided ? session.sub : null,
        providedNote: newProvided ? data.note ?? null : null,
      },
    });

    return NextResponse.json({ ok: true, provided: newProvided });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
