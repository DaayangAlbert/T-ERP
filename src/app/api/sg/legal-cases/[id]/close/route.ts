import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { LegalCaseStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CLOSED_STATUSES: LegalCaseStatus[] = [
  LegalCaseStatus.SETTLED,
  LegalCaseStatus.WON,
  LegalCaseStatus.LOST,
  LegalCaseStatus.ABANDONED,
];

const CloseSchema = z.object({
  resolution: z.string().min(5).max(2000),
  finalStatus: z.enum(["SETTLED", "WON", "LOST", "ABANDONED"]),
  finalProvisionRelease: z.boolean().default(true),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg("canManageLegalCases");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.legalCase.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, status: true, provisionAmount: true, reference: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }
  if (CLOSED_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: "Dossier déjà clos" }, { status: 409 });
  }

  const previousProvision = Number(existing.provisionAmount);

  await prisma.$transaction(async (tx) => {
    await tx.legalCase.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.finalStatus as LegalCaseStatus,
        resolution: parsed.data.resolution,
        closedAt: new Date(),
        provisionAmount: parsed.data.finalProvisionRelease ? 0n : existing.provisionAmount,
      },
    });
    await tx.legalCaseEvent.create({
      data: {
        caseId: existing.id,
        eventType: "CLOSURE",
        eventDate: new Date(),
        description: `Clôture : ${parsed.data.finalStatus} · ${parsed.data.resolution}${parsed.data.finalProvisionRelease && previousProvision > 0 ? ` · reprise provision ${previousProvision.toLocaleString("fr-FR")} FCFA (écriture comptable à passer)` : ""}`,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    status: parsed.data.finalStatus,
    provisionReleased: parsed.data.finalProvisionRelease ? previousProvision : 0,
  });
}
