import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN, Role.ACCOUNTANT];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG / Comptable" }, { status: 403 });
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const period = today.toISOString().slice(0, 7);

  const [todayEntries, draftEntries, banks, recos, closing] = await Promise.all([
    prisma.accountingEntry.count({
      where: { tenantId: session.tenantId, createdAt: { gte: todayStart } },
    }),
    prisma.accountingEntry.count({
      where: { tenantId: session.tenantId, status: "DRAFT", requiresDafValidation: true },
    }),
    prisma.bankAccount.count({ where: { tenantId: session.tenantId } }),
    prisma.bankReconciliation.count({
      where: { tenantId: session.tenantId, period, status: { in: ["COMPLETED", "VALIDATED"] } },
    }),
    prisma.monthlyClosingChecklist.findFirst({
      where: { tenantId: session.tenantId, period },
    }),
  ]);

  // Jours avant clôture (5e jour du mois suivant)
  const closingDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
  const daysToClose = Math.ceil((closingDate.getTime() - today.getTime()) / 86_400_000);

  const checklistItems = (closing?.items as Array<{ status: string }> | undefined) ?? [];
  const checklistDone = checklistItems.filter((i) => i.status === "DONE").length;
  const checklistTotal = checklistItems.length;

  return NextResponse.json({
    period,
    kpis: {
      todayEntries,
      draftToValidate: draftEntries,
      banksTotal: banks,
      banksReconciled: recos,
      daysToClose,
      checklistProgress: { done: checklistDone, total: checklistTotal },
    },
  });
}
