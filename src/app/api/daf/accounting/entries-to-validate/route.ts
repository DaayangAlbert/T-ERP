import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const items = await prisma.accountingEntry.findMany({
    where: { tenantId: session.tenantId, status: "DRAFT", requiresDafValidation: true },
    orderBy: { createdAt: "asc" },
    include: { lines: true },
    take: 100,
  });

  // Récupérer les noms des saisisseurs
  const userIds = Array.from(new Set(items.map((e) => e.enteredBy).filter(Boolean) as string[]));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      reference: e.reference,
      journal: e.journal,
      label: e.label,
      totalDebit: e.totalDebit.toString(),
      totalCredit: e.totalCredit.toString(),
      enteredBy: e.enteredBy ? byId.get(e.enteredBy) ?? "—" : "—",
      hoursSinceEntry: Math.floor((Date.now() - e.createdAt.getTime()) / 3_600_000),
      date: e.date.toISOString(),
      linesCount: e.lines.length,
    })),
  });
}
