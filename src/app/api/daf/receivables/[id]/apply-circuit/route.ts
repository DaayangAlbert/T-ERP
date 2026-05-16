import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { applyCircuitSchema } from "@/schemas/payment-circuits";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT, Role.TENANT_ADMIN];

/**
 * Applique un template de circuit à un dossier de paiement (Receivable).
 * Crée le PaymentTrack et ses PaymentTrackStep pré-initialisés à PENDING.
 * Notifie l'assigné si renseigné.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  try {
    const data = applyCircuitSchema.parse(await req.json());

    const receivable = await prisma.receivable.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { paymentTrack: true },
    });
    if (!receivable) return NextResponse.json({ error: "Créance introuvable" }, { status: 404 });
    if (receivable.paymentTrack) {
      return NextResponse.json(
        { error: "Un circuit est déjà attaché à ce dossier" },
        { status: 409 },
      );
    }

    const template = await prisma.paymentCircuitTemplate.findFirst({
      where: { id: data.templateId, tenantId: session.tenantId, archivedAt: null },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    if (template.steps.length === 0) {
      return NextResponse.json({ error: "Le template n'a aucune étape" }, { status: 400 });
    }

    // Si assignedToId fourni, vérifier qu'il appartient au tenant.
    if (data.assignedToId) {
      const u = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId: session.tenantId, status: "ACTIVE" },
      });
      if (!u) {
        return NextResponse.json({ error: "Utilisateur assigné invalide" }, { status: 400 });
      }
    }

    const track = await prisma.paymentTrack.create({
      data: {
        receivableId: receivable.id,
        templateId: template.id,
        assignedToId: data.assignedToId ?? null,
        createdById: session.sub,
        // La première étape passe directement en IN_PROGRESS, les suivantes restent PENDING.
        steps: {
          create: template.steps.map((s, idx) => ({
            templateStepId: s.id,
            order: s.order,
            label: s.label,
            status: idx === 0 ? "IN_PROGRESS" : "PENDING",
          })),
        },
      },
    });

    if (data.assignedToId && data.assignedToId !== session.sub) {
      await prisma.notification.create({
        data: {
          userId: data.assignedToId,
          type: "payment_track_assigned",
          title: `Suivi paiement assigné · ${template.name}`,
          body: `${receivable.clientName} · ${receivable.invoiceRef} · ${template.steps.length} étapes à suivre.`,
          link: "/direction-financiere/recouvrement",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "payment_circuit.applied",
        entityType: "Receivable",
        entityId: receivable.id,
        metadata: {
          trackId: track.id,
          templateId: template.id,
          templateName: template.name,
          assignedToId: data.assignedToId ?? null,
        },
      },
    });

    return NextResponse.json({ id: track.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
