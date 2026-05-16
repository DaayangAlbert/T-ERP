import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { assignTrackSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.TENANT_ADMIN];

/**
 * Désigne (ou retire) la personne responsable du suivi d'un track.
 * Réservé DAF / TENANT_ADMIN (le DAF arbitre le suivi).
 */
export async function POST(req: Request, { params }: { params: { trackId: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  try {
    const data = assignTrackSchema.parse(await req.json());

    const track = await prisma.paymentTrack.findFirst({
      where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
      include: {
        receivable: { select: { id: true, clientName: true, invoiceRef: true } },
        template: { select: { name: true } },
      },
    });
    if (!track) return NextResponse.json({ error: "Track introuvable" }, { status: 404 });

    if (data.assignedToId) {
      const u = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId: session.tenantId, status: "ACTIVE" },
      });
      if (!u) {
        return NextResponse.json({ error: "Utilisateur invalide" }, { status: 400 });
      }
    }

    await prisma.paymentTrack.update({
      where: { id: track.id },
      data: { assignedToId: data.assignedToId },
    });

    if (data.assignedToId && data.assignedToId !== session.sub) {
      await prisma.notification.create({
        data: {
          userId: data.assignedToId,
          type: "payment_track_assigned",
          title: `Suivi paiement assigné · ${track.template.name}`,
          body: `${track.receivable.clientName} · ${track.receivable.invoiceRef}`,
          link: "/direction-financiere/recouvrement",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
