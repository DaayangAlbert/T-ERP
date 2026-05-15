import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { ToolLoanStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/ouv/tools/mine
// Prêts d'outils actifs (REQUESTED, ISSUED, OVERDUE) + historique des
// 10 derniers retournés. Calcule isOverdue dynamiquement si dueDate dépassé.
export async function GET() {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const all = await prisma.toolLoan.findMany({
    where: { userId: session.sub },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    take: 40,
    select: {
      id: true,
      toolName: true,
      toolCategory: true,
      serialNumber: true,
      status: true,
      requestedAt: true,
      requestReason: true,
      issuedAt: true,
      issuedBy: { select: { firstName: true, lastName: true } },
      dueDate: true,
      isPermanent: true,
      returnedAt: true,
      notes: true,
    },
  });

  const now = Date.now();
  const serialize = (t: (typeof all)[number]) => ({
    id: t.id,
    toolName: t.toolName,
    toolCategory: t.toolCategory,
    serialNumber: t.serialNumber,
    status: t.status,
    requestedAt: t.requestedAt.toISOString(),
    requestReason: t.requestReason,
    issuedAt: t.issuedAt?.toISOString() ?? null,
    issuedByName: t.issuedBy ? `${t.issuedBy.firstName} ${t.issuedBy.lastName}` : null,
    dueDate: t.dueDate?.toISOString() ?? null,
    isPermanent: t.isPermanent,
    returnedAt: t.returnedAt?.toISOString() ?? null,
    notes: t.notes,
    isOverdue:
      t.status === ToolLoanStatus.ISSUED && t.dueDate
        ? t.dueDate.getTime() < now
        : t.status === ToolLoanStatus.OVERDUE,
  });

  const active = all.filter(
    (t) =>
      t.status === ToolLoanStatus.ISSUED || t.status === ToolLoanStatus.OVERDUE
  );
  const pending = all.filter((t) => t.status === ToolLoanStatus.REQUESTED);
  const history = all.filter(
    (t) =>
      t.status === ToolLoanStatus.RETURNED ||
      t.status === ToolLoanStatus.LOST ||
      t.status === ToolLoanStatus.CANCELLED
  );

  return NextResponse.json({
    active: active.map(serialize),
    pending: pending.map(serialize),
    history: history.slice(0, 10).map(serialize),
    stats: {
      active: active.length,
      pending: pending.length,
      overdue: active.filter((t) => t.dueDate && t.dueDate.getTime() < now).length,
    },
  });
}
