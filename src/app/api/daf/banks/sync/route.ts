import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// Placeholder pour intégration API banques (V2). Pour le V1 on simule
// la sync en touchant lastSyncAt sur tous les comptes.
export async function POST() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const updated = await prisma.bankAccount.updateMany({
    where: { tenantId: session.tenantId },
    data: { lastSyncAt: new Date(), syncStatus: "LIVE" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "bank.sync",
      entityType: "BankAccount",
      metadata: { count: updated.count, mode: "MANUAL_TRIGGER" },
    },
  });

  return NextResponse.json({
    ok: true,
    syncedCount: updated.count,
    note: "V1 simulation. L'intégration réelle (UBA Open Banking, BICEC, Afriland API) viendra en V2.",
  });
}
