import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { Confidentiality, GedAuditAction, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  confidentiality: z.nativeEnum(Confidentiality),
  responsibleId: z.string().cuid().nullable().optional(),
});

// Réservé aux ARCHIVIST / TENANT_ADMIN — pas au DG en lecture seule.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json(
      { error: "Modification de politique d'accès réservée à l'ARCHIVIST" },
      { status: 403 },
    );
  }

  const existing = await prisma.documentSpace.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, confidentiality: true, responsibleId: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.$transaction([
      prisma.documentSpace.update({
        where: { id: params.id },
        data: {
          confidentiality: data.confidentiality,
          responsibleId: data.responsibleId ?? null,
        },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: session.sub,
          action: GedAuditAction.MODIFICATION,
          spaceId: params.id,
          metadata: {
            kind: "ACCESS_POLICY",
            before: { confidentiality: existing.confidentiality, responsibleId: existing.responsibleId },
            after: { confidentiality: data.confidentiality, responsibleId: data.responsibleId ?? null },
            spaceName: existing.name,
          },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
