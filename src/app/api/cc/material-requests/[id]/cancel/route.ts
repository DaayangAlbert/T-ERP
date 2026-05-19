import { NextResponse } from "next/server";
import { MaterialRequestStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Annule une demande de matériel (par le CC émetteur, tant qu'elle est
 * encore PENDING). Notifie le magasinier.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const req = await prisma.materialRequest.findFirst({
    where: { id: params.id, requesterId: session.sub },
    include: { warehouse: { select: { keeperId: true } } },
  });
  if (!req) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (req.status !== MaterialRequestStatus.PENDING) {
    return NextResponse.json(
      { error: "Seules les demandes en attente peuvent être annulées" },
      { status: 409 },
    );
  }

  await prisma.materialRequest.update({
    where: { id: params.id },
    data: { status: MaterialRequestStatus.CANCELLED },
  });

  // Informe le magasinier de l'annulation
  if (req.warehouse.keeperId) {
    await prisma.notification.create({
      data: {
        userId: req.warehouse.keeperId,
        type: "material_request_cancelled",
        title: `Demande annulée — ${req.reference}`,
        body: "Le chef de chantier a annulé sa demande.",
        link: "/magasin/demandes",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
