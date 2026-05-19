import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// Actions comptables sensibles surveillées par le DAF — toute modification
// d'une écriture déjà validée doit ressortir ici pour le CAC.
const SENSITIVE_ACTIONS = [
  "accounting.entry.validate",
  "accounting.entry.reject",
  "accounting.entry.update",
  "accounting.entry.reverse",
  "accounting.entry.delete",
  "accounting.entry.unlock",
  "accounting.monthly_closing.close",
  "accounting.monthly_closing.reopen",
];

const ACTION_LABELS: Record<string, string> = {
  "accounting.entry.validate": "Validation écriture",
  "accounting.entry.reject": "Rejet écriture",
  "accounting.entry.update": "Modification écriture validée",
  "accounting.entry.reverse": "Contre-passation",
  "accounting.entry.delete": "Suppression écriture",
  "accounting.entry.unlock": "Déverrouillage écriture",
  "accounting.monthly_closing.close": "Clôture mensuelle",
  "accounting.monthly_closing.reopen": "Réouverture période",
};

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sinceDays = Number(url.searchParams.get("sinceDays") ?? "30");
  const since = new Date(Date.now() - sinceDays * 86_400_000);

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: session.tenantId,
      action: { in: SENSITIVE_ACTIONS },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
  });

  const items = logs.map((l) => ({
    id: l.id,
    action: l.action,
    actionLabel: ACTION_LABELS[l.action] ?? l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    user: l.user ? `${l.user.firstName} ${l.user.lastName}` : "Système",
    userRole: l.user?.role ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  return NextResponse.json({ items, sinceDays });
}
