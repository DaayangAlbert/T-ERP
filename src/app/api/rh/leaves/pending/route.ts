import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, LeaveStatus, type LeaveType } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";
import { LEAVE_TYPE_LABEL as TYPE_LABEL } from "@/lib/emp-labels";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

async function ensureSeedRequests(tenantId: string) {
  const existing = await prisma.leaveRequest.count({ where: { tenantId, status: "PENDING" } });
  if (existing >= 7) return;
  const pool = getSyntheticPersonnel(487).slice(0, 7);
  const today = new Date();
  for (const [i, p] of pool.entries()) {
    const start = new Date(today.getTime() + (i + 2) * 86_400_000);
    const days = [3, 5, 2, 10, 1, 7, 4][i];
    const end = new Date(start.getTime() + days * 86_400_000);
    const types: LeaveType[] = ["PAID_LEAVE", "RTT", "SICK", "PAID_LEAVE", "UNPAID", "PAID_LEAVE", "FAMILY"];
    const reasons = [
      "Vacances de Pâques en famille",
      "Récupération heures sup avril",
      "Consultation médicale + arrêt maladie",
      "Mariage frère à Bafoussam",
      "Démarches administratives mairie",
      "Repos congés acquis Q1",
      "Décès tante maternelle (3 jours)",
    ];
    await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeKey: p.id,
        employeeName: `${p.firstName} ${p.lastName}`,
        type: types[i],
        startDate: start,
        endDate: end,
        daysCount: days,
        reason: reasons[i],
        status: i === 0 ? "N1_APPROVED" : "PENDING",
      },
    });
  }
}

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  await ensureSeedRequests(session.tenantId);

  const requests = await prisma.leaveRequest.findMany({
    where: { tenantId: session.tenantId, status: { in: [LeaveStatus.PENDING, LeaveStatus.N1_APPROVED] } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({
    items: requests.map((r) => ({
      id: r.id,
      employeeKey: r.employeeKey,
      employeeName: r.employeeName,
      type: r.type,
      typeLabel: TYPE_LABEL[r.type],
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      daysCount: r.daysCount,
      reason: r.reason,
      status: r.status,
      n1ValidatedAt: r.n1ValidatedAt?.toISOString() ?? null,
    })),
  });
}
