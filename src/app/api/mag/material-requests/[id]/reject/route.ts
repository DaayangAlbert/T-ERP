import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MaterialRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";
import { rejectMaterialRequestSchema } from "@/schemas/material-request";

export const dynamic = "force-dynamic";

/**
 * Refuse une demande de matériel avec un motif obligatoire. Notifie le CC.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, allWarehouses } = guard;

  try {
    const { reason } = rejectMaterialRequestSchema.parse(await req.json());

    const accessibleWarehouseIds = new Set(allWarehouses.map((w) => w.id));
    const request = await prisma.materialRequest.findUnique({
      where: { id: params.id },
    });
    if (!request) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    if (!accessibleWarehouseIds.has(request.warehouseId)) {
      return NextResponse.json({ error: "Magasin hors périmètre" }, { status: 403 });
    }
    if (request.status !== MaterialRequestStatus.PENDING) {
      return NextResponse.json(
        { error: `Demande déjà ${request.status.toLowerCase()}` },
        { status: 409 },
      );
    }

    await prisma.materialRequest.update({
      where: { id: request.id },
      data: {
        status: MaterialRequestStatus.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
        fulfilledById: session.sub, // qui a traité (refus inclus)
      },
    });

    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: "material_request_rejected",
        title: `Demande refusée — ${request.reference}`,
        body: `Motif : ${reason.slice(0, 200)}`,
        link: "/chef-chantier/demandes-materiel",
      },
    });

    return NextResponse.json({ id: request.id, status: MaterialRequestStatus.REJECTED });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/mag/material-requests/[id]/reject]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
