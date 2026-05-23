import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

// POST — décision de gouvernance du Propriétaire / PCA sur une validation.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  try {
    const { decision, reason } = schema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);

    const validation = await prisma.validation.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
    });
    if (!validation) return NextResponse.json({ error: "Décision introuvable" }, { status: 404 });
    if (validation.ownerDecision !== "PENDING") {
      return NextResponse.json({ error: "Cette demande n'attend pas (ou plus) votre avis" }, { status: 409 });
    }
    if (decision === "REJECT" && !reason?.trim()) {
      return NextResponse.json({ error: "Un motif est requis pour refuser" }, { status: 400 });
    }

    // Le PCA rend un AVIS (autorisation), il ne finalise pas : c'est le DG qui
    // confirmera ensuite sa validation. On enregistre l'avis du PCA.
    const ownerDecision = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction([
      prisma.validation.update({
        where: { id: validation.id },
        data: {
          ownerDecision,
          ownerDecisionAt: new Date(),
          ownerDecisionById: session.sub,
          ownerDecisionReason: reason ?? null,
        },
      }),
      // Notifie le DG qui a demandé l'autorisation.
      ...(validation.ownerEscalatedById
        ? [
            prisma.notification.create({
              data: {
                userId: validation.ownerEscalatedById,
                type: "owner_decision_done",
                title: decision === "APPROVE" ? "Le PCA a donné son accord" : "Le PCA a refusé",
                body: `${validation.reference} — ${validation.title}${reason ? ` : ${reason}` : ""}`,
                link: "/direction-generale/validations",
              },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.sub,
          action: decision === "APPROVE" ? "owner.decision.approve" : "owner.decision.reject",
          entityType: "Validation",
          entityId: validation.id,
          metadata: { reference: validation.reference, amount: validation.amount?.toString() ?? null, reason: reason ?? null },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, ownerDecision });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/owner/decisions/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
