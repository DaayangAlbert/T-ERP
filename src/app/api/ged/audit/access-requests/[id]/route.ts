import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AccessStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.ARCHIVIST && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Référent documentaire" }, { status: 403 });
  }

  const body = await req.json();
  const action: "approve" | "deny" = body.action;
  if (!action) return NextResponse.json({ error: "Action requise" }, { status: 400 });
  if (action === "deny" && !body.reason) {
    return NextResponse.json({ error: "Motif obligatoire" }, { status: 400 });
  }

  const status: AccessStatus = action === "approve" ? "APPROVED" : "DENIED";
  const expiresAt = action === "approve" ? new Date(Date.now() + 7 * 86400_000) : null;

  await prisma.documentAccessRequest.update({
    where: { id: params.id },
    data: {
      status,
      decidedById: session.sub,
      decidedAt: new Date(),
      decisionNotes: body.reason ?? null,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true });
}
