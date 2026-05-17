import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [
  Role.DAF,
  Role.DG,
  Role.TECH_DIRECTOR,
  Role.TENANT_ADMIN,
  Role.SECRETARY_GENERAL,
  Role.ACCOUNTANT,
];

/**
 * Vue consolidée lecture seule des recouvrements en cours pour DG / DT.
 * Retourne TOUS les receivables non payés du tenant, avec le track de
 * circuit de paiement attaché (si défini), les étapes et l'assigné.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const receivables = await prisma.receivable.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE", "LITIGATION"] },
    },
    include: {
      paymentTrack: {
        include: {
          template: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          steps: {
            orderBy: { order: "asc" },
            include: {
              validatedBy: { select: { firstName: true, lastName: true } },
              blockedBy: { select: { firstName: true, lastName: true } },
              documents: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
      reminders: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { level: true, channel: true, sentAt: true },
      },
    },
    orderBy: [{ daysOverdue: "desc" }, { dueDate: "asc" }],
  });

  const totalAmount = receivables.reduce((s, r) => s + r.amount - r.paidAmount, 0n);
  const blockedCount = receivables.filter(
    (r) => r.paymentTrack?.steps.some((s) => s.status === "BLOCKED"),
  ).length;
  const tracksCount = receivables.filter((r) => r.paymentTrack !== null).length;
  const overdueCount = receivables.filter((r) => r.daysOverdue > 0).length;

  return NextResponse.json({
    summary: {
      total: receivables.length,
      totalAmount: totalAmount.toString(),
      overdueCount,
      tracksCount,
      blockedCount,
    },
    items: receivables.map((r) => ({
      id: r.id,
      invoiceRef: r.invoiceRef,
      clientName: r.clientName,
      amount: r.amount.toString(),
      paidAmount: r.paidAmount.toString(),
      remaining: (r.amount - r.paidAmount).toString(),
      issueDate: r.issueDate.toISOString(),
      dueDate: r.dueDate.toISOString(),
      daysOverdue: r.daysOverdue,
      status: r.status,
      lastReminder: r.reminders[0]
        ? {
            level: r.reminders[0].level,
            channel: r.reminders[0].channel,
            sentAt: r.reminders[0].sentAt.toISOString(),
          }
        : null,
      paymentTrack: r.paymentTrack
        ? {
            id: r.paymentTrack.id,
            templateName: r.paymentTrack.template.name,
            assignedTo: r.paymentTrack.assignedTo,
            startedAt: r.paymentTrack.startedAt.toISOString(),
            completedAt: r.paymentTrack.completedAt?.toISOString() ?? null,
            steps: r.paymentTrack.steps.map((s) => ({
              id: s.id,
              order: s.order,
              label: s.label,
              status: s.status,
              validatedAt: s.validatedAt?.toISOString() ?? null,
              validatedBy: s.validatedBy,
              blockedReason: s.blockedReason,
              blockedSince: s.blockedSince?.toISOString() ?? null,
              blockedBy: s.blockedBy,
              documents: s.documents.map((d) => ({
                id: d.id,
                label: d.label,
                provided: d.provided,
                providedAt: d.providedAt?.toISOString() ?? null,
              })),
            })),
          }
        : null,
    })),
  });
}
