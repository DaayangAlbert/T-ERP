import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { CorrespondenceStatus, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SignSchema = z.object({
  signatureRef: z.string().min(3).max(120),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== Role.DG && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé au Directeur Général" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = SignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const c = await prisma.officialCorrespondence.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, status: true },
  });
  if (!c) {
    return NextResponse.json({ error: "Courrier introuvable" }, { status: 404 });
  }
  if (c.status !== CorrespondenceStatus.AWAITING_DG_SIGNATURE) {
    return NextResponse.json({ error: "Courrier non en attente de signature" }, { status: 409 });
  }

  await prisma.officialCorrespondence.update({
    where: { id: c.id },
    data: {
      status: CorrespondenceStatus.SIGNED,
      signedByDgAt: new Date(),
      dgSignatureRef: parsed.data.signatureRef,
    },
  });

  return NextResponse.json({ ok: true });
}
