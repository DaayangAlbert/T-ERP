import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  MaterialRequestStatus,
  WarehouseMovementDirection,
  WarehouseMovementReason,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardMagWarehouseMutation } from "@/lib/rbac/mag-guard";
import { fulfillMaterialRequestSchema } from "@/schemas/material-request";

export const dynamic = "force-dynamic";

/**
 * Honore une demande de matériel : crée les WarehouseMovement OUT
 * correspondants, met à jour les WarehouseStock, marque la demande
 * FULFILLED ou PARTIAL. Tout en transaction.
 *
 * Notifie le CC demandeur du succès.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardMagWarehouseMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, allWarehouses } = guard;

  try {
    const input = fulfillMaterialRequestSchema.parse(await req.json());

    const accessibleWarehouseIds = new Set(allWarehouses.map((w) => w.id));

    const request = await prisma.materialRequest.findUnique({
      where: { id: params.id },
      include: { lines: true, warehouse: { select: { id: true } } },
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

    // Validation des lignes : chaque ligne envoyée doit exister + quantité raisonnable
    const lineById = new Map(request.lines.map((l) => [l.id, l]));
    let isPartial = false;
    let allZero = true;
    for (const li of input.lines) {
      const existing = lineById.get(li.lineId);
      if (!existing) {
        return NextResponse.json(
          { error: `Ligne ${li.lineId} introuvable dans cette demande` },
          { status: 400 },
        );
      }
      if (li.quantityFulfilled > existing.quantityRequested) {
        return NextResponse.json(
          {
            error: `Quantité servie (${li.quantityFulfilled}) > demandée (${existing.quantityRequested})`,
          },
          { status: 400 },
        );
      }
      if (li.quantityFulfilled > 0) allZero = false;
      if (li.quantityFulfilled < existing.quantityRequested) isPartial = true;
    }
    if (allZero) {
      return NextResponse.json(
        { error: "Aucune quantité servie — utilisez 'Refuser' pour rejeter intégralement" },
        { status: 400 },
      );
    }

    // Transaction : update lines + create movements + update stocks + update request
    const movementRef = `MR-OUT-${request.reference}`;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const li of input.lines) {
        const existing = lineById.get(li.lineId)!;
        if (li.quantityFulfilled <= 0) continue;

        // Update ligne
        await tx.materialRequestLine.update({
          where: { id: li.lineId },
          data: { quantityFulfilled: li.quantityFulfilled },
        });

        // Récupère le stock actuel pour calculer le total value
        const stock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_articleId: {
              warehouseId: request.warehouseId,
              articleId: existing.articleId,
            },
          },
          select: { quantity: true, pmpUnitPrice: true, totalValue: true },
        });
        const unitPrice = stock?.pmpUnitPrice ?? 0n;
        const moveValue = BigInt(Math.round(Number(unitPrice) * li.quantityFulfilled));

        // Crée le mouvement OUT (consommation chantier)
        await tx.warehouseMovement.create({
          data: {
            warehouseId: request.warehouseId,
            articleId: existing.articleId,
            direction: WarehouseMovementDirection.OUT,
            quantity: li.quantityFulfilled,
            unitPrice,
            totalValue: moveValue,
            reference: movementRef,
            reason: WarehouseMovementReason.CONSUMPTION_TEAM,
            destinationTeamId: null,
            recordedById: session.sub,
            occurredAt: now,
          },
        });

        // Décrémente le stock (création s'il n'existe pas)
        if (stock) {
          const newQty = Math.max(0, stock.quantity - li.quantityFulfilled);
          const newValue = BigInt(Math.round(Number(unitPrice) * newQty));
          await tx.warehouseStock.update({
            where: {
              warehouseId_articleId: {
                warehouseId: request.warehouseId,
                articleId: existing.articleId,
              },
            },
            data: {
              quantity: newQty,
              totalValue: newValue,
              lastOutAt: now,
            },
          });
        }
      }

      // Marque la demande FULFILLED ou PARTIAL
      await tx.materialRequest.update({
        where: { id: request.id },
        data: {
          status: isPartial
            ? MaterialRequestStatus.PARTIAL
            : MaterialRequestStatus.FULFILLED,
          fulfilledById: session.sub,
          fulfilledAt: now,
        },
      });
    });

    // Notifie le CC demandeur
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { firstName: true, lastName: true },
    });
    const fulfiller = me ? `${me.firstName} ${me.lastName}` : "Le magasinier";
    await prisma.notification.create({
      data: {
        userId: request.requesterId,
        type: "material_request_fulfilled",
        title: `Demande ${isPartial ? "partiellement " : ""}honorée — ${request.reference}`,
        body: `${fulfiller} a sorti le matériel${input.notes ? ` · ${input.notes.slice(0, 100)}` : ""}.`,
        link: "/chef-chantier/demandes-materiel",
      },
    });

    return NextResponse.json({
      id: request.id,
      status: isPartial ? MaterialRequestStatus.PARTIAL : MaterialRequestStatus.FULFILLED,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/mag/material-requests/[id]/fulfill]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
