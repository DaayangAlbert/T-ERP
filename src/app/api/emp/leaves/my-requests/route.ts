import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEmp } from "@/lib/rbac/emp-guard";

export const dynamic = "force-dynamic";

/**
 * Demandes de congé de l'utilisateur connecté. Renvoie d'abord celles en
 * attente (PENDING), puis l'historique antéchronologique. Inclut le
 * libellé du validateur pour l'affichage "demandé il y a 3 jours ·
 * validation Jean KAMGA · délai max 5 j ouvrés".
 */
export async function GET() {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const all = await prisma.leaveRequest.findMany({
    where: { userId: session.sub },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      daysCount: true,
      reason: true,
      justificationDoc: true,
      status: true,
      n1ValidatedBy: true,
      n1ValidatedAt: true,
      rhValidatedBy: true,
      rhValidatedAt: true,
      rejectionReason: true,
      createdAt: true,
      validator: { select: { firstName: true, lastName: true } },
    },
  });

  const pending = all.filter((r) => r.status === "PENDING");
  const history = all.filter((r) => r.status !== "PENDING");

  return NextResponse.json({
    pending: pending.map((r) => ({
      ...r,
      validatorName: r.validator ? `${r.validator.firstName} ${r.validator.lastName}` : null,
    })),
    history: history.map((r) => ({
      ...r,
      validatorName: r.validator ? `${r.validator.firstName} ${r.validator.lastName}` : null,
    })),
  });
}
