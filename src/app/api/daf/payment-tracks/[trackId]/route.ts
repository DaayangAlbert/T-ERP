import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT, Role.TENANT_ADMIN];

/**
 * Détail complet d'un track : steps + documents.
 * Le user assigné y a aussi accès même s'il n'est pas DAF/Comptable.
 */
export async function GET(_req: Request, { params }: { params: { trackId: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const track = await prisma.paymentTrack.findFirst({
    where: { id: params.trackId, receivable: { tenantId: session.tenantId } },
    include: {
      template: { select: { id: true, name: true, clientName: true } },
      receivable: { select: { id: true, invoiceRef: true, clientName: true, amount: true, dueDate: true, status: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, position: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          validatedBy: { select: { id: true, firstName: true, lastName: true } },
          blockedBy: { select: { id: true, firstName: true, lastName: true } },
          documents: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!track) return NextResponse.json({ error: "Track introuvable" }, { status: 404 });

  const isAllowed = ALLOWED.includes(session.role as Role) || track.assignedToId === session.sub;
  if (!isAllowed) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({
    id: track.id,
    template: track.template,
    receivable: {
      ...track.receivable,
      amount: track.receivable.amount.toString(),
      dueDate: track.receivable.dueDate.toISOString(),
    },
    assignedTo: track.assignedTo,
    createdBy: track.createdBy,
    startedAt: track.startedAt.toISOString(),
    completedAt: track.completedAt?.toISOString() ?? null,
    steps: track.steps.map((s) => ({
      id: s.id,
      order: s.order,
      label: s.label,
      status: s.status,
      validatedAt: s.validatedAt?.toISOString() ?? null,
      validatedBy: s.validatedBy,
      blockedReason: s.blockedReason,
      blockedSince: s.blockedSince?.toISOString() ?? null,
      blockedBy: s.blockedBy,
      documents: s.documents.map((d) => ({
        id: d.id,
        label: d.label,
        provided: d.provided,
        providedAt: d.providedAt?.toISOString() ?? null,
        providedNote: d.providedNote,
      })),
    })),
  });
}
