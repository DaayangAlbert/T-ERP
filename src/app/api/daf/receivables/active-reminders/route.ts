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

  const items = await prisma.receivable.findMany({
    where: {
      tenantId: session.tenantId,
      OR: [{ status: "OVERDUE" }, { status: "LITIGATION" }, { reminders: { some: {} } }],
    },
    include: {
      reminders: { orderBy: { sentAt: "desc" }, take: 1 },
    },
    orderBy: { daysOverdue: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: items.map((r) => {
      const lastReminder = r.reminders[0];
      const remaining = r.amount - r.paidAmount;
      return {
        id: r.id,
        invoiceRef: r.invoiceRef,
        clientName: r.clientName,
        amount: remaining.toString(),
        totalAmount: r.amount.toString(),
        daysOverdue: r.daysOverdue,
        status: r.status,
        currentLevel: lastReminder?.level ?? null,
        lastReminderAt: lastReminder?.sentAt.toISOString() ?? null,
        lastReminderChannel: lastReminder?.channel ?? null,
        lastReminderResponse: lastReminder?.responseReceived ?? false,
        reminderCount: r.reminders.length,
      };
    }),
  });
}
