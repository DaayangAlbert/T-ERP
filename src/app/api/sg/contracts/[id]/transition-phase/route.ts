import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { ContractPhase, MarketContractStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Transitions valides du cycle de vie 8 phases :
// CALL_FOR_TENDERS_WATCH → STUDY_AND_SUBMISSION → AWAITING_ATTRIBUTION
//   → CONTRACT_SIGNATURE → ORDER_SERVICE → EXECUTION → RECEPTION
//   → GUARANTEE_PERIOD → CLOSED
// (rétro-transition autorisée vers phase précédente avec motif)
const FORWARD_TRANSITIONS: Record<ContractPhase, ContractPhase[]> = {
  CALL_FOR_TENDERS_WATCH: [ContractPhase.STUDY_AND_SUBMISSION],
  STUDY_AND_SUBMISSION: [ContractPhase.AWAITING_ATTRIBUTION],
  AWAITING_ATTRIBUTION: [ContractPhase.CONTRACT_SIGNATURE, ContractPhase.CLOSED],
  CONTRACT_SIGNATURE: [ContractPhase.ORDER_SERVICE],
  ORDER_SERVICE: [ContractPhase.EXECUTION],
  EXECUTION: [ContractPhase.RECEPTION],
  RECEPTION: [ContractPhase.GUARANTEE_PERIOD],
  GUARANTEE_PERIOD: [ContractPhase.CLOSED],
  CLOSED: [],
};

const schema = z.object({
  targetPhase: z.nativeEnum(ContractPhase),
  reason: z.string().max(2000).optional(),
  date: z.string().datetime().optional(),
});

// Auto-update du status MarketContract selon la phase :
// CALL_FOR_TENDERS_WATCH / STUDY / AWAITING → DRAFT
// CONTRACT_SIGNATURE / ORDER_SERVICE / EXECUTION / RECEPTION / GUARANTEE → ACTIVE
// CLOSED → CLOSED
function deriveStatus(phase: ContractPhase): MarketContractStatus {
  if (phase === ContractPhase.CLOSED) return MarketContractStatus.CLOSED;
  if (
    phase === ContractPhase.CALL_FOR_TENDERS_WATCH ||
    phase === ContractPhase.STUDY_AND_SUBMISSION ||
    phase === ContractPhase.AWAITING_ATTRIBUTION
  )
    return MarketContractStatus.DRAFT;
  return MarketContractStatus.ACTIVE;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg("canManageMarketContracts");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const c = await prisma.clientContract.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, phase: true },
  });
  if (!c) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const allowed = FORWARD_TRANSITIONS[c.phase];
    if (!allowed.includes(data.targetPhase)) {
      return NextResponse.json(
        {
          error: `Transition non autorisée : ${c.phase} → ${data.targetPhase}. Phases possibles : ${allowed.join(", ") || "(aucune)"}`,
        },
        { status: 400 },
      );
    }

    const eventDate = data.date ? new Date(data.date) : new Date();
    const dateFieldUpdates: Record<string, Date> = {};
    switch (data.targetPhase) {
      case ContractPhase.STUDY_AND_SUBMISSION:
        dateFieldUpdates.submissionDate = eventDate;
        break;
      case ContractPhase.AWAITING_ATTRIBUTION:
        dateFieldUpdates.notificationDate = eventDate;
        break;
      case ContractPhase.CONTRACT_SIGNATURE:
        dateFieldUpdates.signatureDate = eventDate;
        break;
      case ContractPhase.ORDER_SERVICE:
        dateFieldUpdates.orderServiceDate = eventDate;
        break;
      case ContractPhase.EXECUTION:
        dateFieldUpdates.executionStartDate = eventDate;
        break;
      case ContractPhase.RECEPTION:
        dateFieldUpdates.receptionPV = eventDate;
        break;
      case ContractPhase.GUARANTEE_PERIOD:
        // 12 mois de GPA standard à compter de la réception
        dateFieldUpdates.gpaEndDate = new Date(eventDate.getTime() + 365 * 86_400_000);
        break;
    }

    await prisma.clientContract.update({
      where: { id: params.id },
      data: {
        phase: data.targetPhase,
        status: deriveStatus(data.targetPhase),
        ...dateFieldUpdates,
      },
    });

    return NextResponse.json({ ok: true, phase: data.targetPhase, status: deriveStatus(data.targetPhase) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
