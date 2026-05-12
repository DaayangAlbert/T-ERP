import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, TransferStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.LOGISTICS && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const body = await req.json();
  const action: "approve" | "reject" | "schedule" | "complete" = body.action;
  if (!action) return NextResponse.json({ error: "Action requise" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (action === "approve") {
    updates.status = "APPROVED" as TransferStatus;
    updates.arbitratedById = session.sub;
    updates.arbitratedAt = new Date();
    updates.arbitrationNote = body.note ?? null;
  } else if (action === "reject") {
    if (!body.note) return NextResponse.json({ error: "Motif requis" }, { status: 400 });
    updates.status = "REJECTED" as TransferStatus;
    updates.arbitratedById = session.sub;
    updates.arbitratedAt = new Date();
    updates.arbitrationNote = body.note;
  } else if (action === "schedule") {
    updates.status = "SCHEDULED" as TransferStatus;
    updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();
  } else if (action === "complete") {
    updates.status = "COMPLETED" as TransferStatus;
    updates.completedAt = new Date();
  }

  await prisma.interSiteTransfer.update({ where: { id: params.id }, data: updates });
  return NextResponse.json({ ok: true });
}
