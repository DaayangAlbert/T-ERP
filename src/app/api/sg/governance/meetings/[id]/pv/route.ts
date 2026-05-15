import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { MeetingStatus, RegisterType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  documentUrl: z.string().url(),
  signedBy: z.string().min(2).max(120),
  attendees: z.any().optional(),
  quorum: z.number().min(0).max(100).optional(),
});

// POST /api/sg/governance/meetings/:id/pv — téléverse le PV signé.
// Marque la réunion COMPLETED + horodate signature + indexe au registre
// des décisions (incrémente entriesCount du RegulatoryRegister
// BOARD_DECISIONS ou AG_DECISIONS).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  const m = await prisma.governanceMeeting.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, type: true, status: true },
  });
  if (!m) return NextResponse.json({ error: "Réunion introuvable" }, { status: 404 });
  if (m.status === MeetingStatus.CANCELLED) {
    return NextResponse.json({ error: "Réunion annulée — PV non applicable" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const registerType =
      m.type === "BOARD_MEETING" ? RegisterType.BOARD_DECISIONS : RegisterType.AG_DECISIONS;

    const ops: any[] = [
      prisma.governanceMeeting.update({
        where: { id: m.id },
        data: {
          pvDocumentUrl: data.documentUrl,
          pvSignedAt: new Date(),
          pvSignedBy: data.signedBy,
          status: MeetingStatus.COMPLETED,
          attendees: data.attendees ?? undefined,
          quorum: data.quorum,
        },
      }),
    ];

    // Indexation registre : tente d'incrémenter si registre existant
    const register = await prisma.regulatoryRegister.findFirst({
      where: { tenantId, registerType },
      select: { id: true, entriesCount: true },
    });
    if (register) {
      ops.push(
        prisma.regulatoryRegister.update({
          where: { id: register.id },
          data: { entriesCount: register.entriesCount + 1, lastEntryDate: new Date() },
        }),
      );
    }

    await prisma.$transaction(ops);

    return NextResponse.json({ ok: true, indexed: !!register });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
