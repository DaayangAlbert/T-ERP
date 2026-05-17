import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Tracks de paiement dont l'utilisateur courant est responsable du suivi.
 * Endpoint user-scoped : pas de filtre par rôle, juste par assignedToId.
 * Inclut un résumé par track (étape courante, progression, blocages).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const includeCompleted = url.searchParams.get("includeCompleted") === "1";

  const tracks = await prisma.paymentTrack.findMany({
    where: {
      assignedToId: session.sub,
      ...(includeCompleted ? {} : { completedAt: null }),
    },
    include: {
      receivable: {
        select: {
          id: true,
          invoiceRef: true,
          clientName: true,
          amount: true,
          dueDate: true,
          daysOverdue: true,
          status: true,
        },
      },
      template: { select: { id: true, name: true } },
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          label: true,
          status: true,
          blockedSince: true,
        },
      },
    },
    orderBy: [{ completedAt: "asc" }, { receivable: { daysOverdue: "desc" } }],
  });

  const response = NextResponse.json({
    _meta: {
      userId: session.sub,
      role: session.role,
      tenantId: session.tenantId,
      tracksFound: tracks.length,
    },
    items: tracks.map((t) => {
      const validated = t.steps.filter((s) => s.status === "VALIDATED").length;
      const total = t.steps.length;
      const current = t.steps.find(
        (s) => s.status === "IN_PROGRESS" || s.status === "BLOCKED",
      );
      const isBlocked = current?.status === "BLOCKED";
      return {
        id: t.id,
        templateName: t.template.name,
        receivable: {
          id: t.receivable.id,
          invoiceRef: t.receivable.invoiceRef,
          clientName: t.receivable.clientName,
          amount: t.receivable.amount.toString(),
          daysOverdue: t.receivable.daysOverdue,
          status: t.receivable.status,
        },
        progress: { validated, total, percent: Math.round((validated / total) * 100) },
        currentStep: current
          ? {
              order: current.order,
              label: current.label,
              status: current.status,
              blockedSince: current.blockedSince?.toISOString() ?? null,
            }
          : null,
        isBlocked,
        startedAt: t.startedAt.toISOString(),
        completedAt: t.completedAt?.toISOString() ?? null,
      };
    }),
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
