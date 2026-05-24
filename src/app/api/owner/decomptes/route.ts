import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, PaymentStepStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.OWNER, Role.SUPER_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé au Propriétaire / PCA" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const tracks = await prisma.paymentTrack.findMany({
    where: { receivable: { tenantId: { in: scopeIds } } },
    include: {
      receivable: { select: { invoiceRef: true, clientName: true, amount: true, paidAmount: true, dueDate: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      steps: {
        orderBy: { order: "asc" },
        include: { documents: { select: { label: true, provided: true } } },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  let montantTotal = 0n;
  let montantBloque = 0n;
  let nbBloques = 0;
  let nbEnCours = 0;
  let nbTermines = 0;

  const items = tracks.map((t) => {
    const total = t.steps.length;
    const valides = t.steps.filter((s) => s.status === PaymentStepStatus.VALIDATED).length;
    const blockedSteps = t.steps.filter((s) => s.status === PaymentStepStatus.BLOCKED);
    const enCours = t.steps.find((s) => s.status === PaymentStepStatus.IN_PROGRESS || s.status === PaymentStepStatus.PENDING);
    const estTermine = Boolean(t.completedAt) || (total > 0 && valides === total);
    const estBloque = blockedSteps.length > 0;

    const montant = t.receivable.amount;
    montantTotal += montant;
    if (estBloque) { montantBloque += montant; nbBloques++; }
    else if (estTermine) nbTermines++;
    else nbEnCours++;

    return {
      id: t.id,
      decompte: t.receivable.invoiceRef,
      client: t.receivable.clientName,
      montant: montant.toString(),
      reste: (t.receivable.amount - t.receivable.paidAmount).toString(),
      echeance: t.receivable.dueDate.toISOString(),
      suiviPar: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null,
      etapesTotal: total,
      etapesValidees: valides,
      etapeCourante: estTermine ? "Terminé" : enCours?.label ?? blockedSteps[0]?.label ?? "—",
      statut: estTermine ? "termine" : estBloque ? "bloque" : "en_cours",
      blocages: blockedSteps.map((s) => ({
        etape: s.label,
        motif: s.blockedReason,
        depuis: s.blockedSince?.toISOString() ?? null,
        documentsManquants: s.documents.filter((d) => !d.provided).map((d) => d.label),
      })),
    };
  });

  return NextResponse.json({
    resume: {
      total: items.length,
      enCours: nbEnCours,
      bloques: nbBloques,
      termines: nbTermines,
      montantTotal: montantTotal.toString(),
      montantBloque: montantBloque.toString(),
    },
    items,
  });
}
