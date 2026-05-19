import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, type LeaveType } from "@prisma/client";
import { LEAVE_TYPE_COLOR as TYPE_COLOR } from "@/lib/emp-labels";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  const daysInMonth = to.getDate();

  const requests = await prisma.leaveRequest.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["RH_APPROVED", "N1_APPROVED"] },
      startDate: { lte: to },
      endDate: { gte: from },
    },
  });

  // Sélection : employés réels avec demande sur le mois, complétés par les
  // collaborateurs actifs sans demande pour garnir le calendrier (max 25).
  const employees = new Map<string, string>();
  for (const r of requests) employees.set(r.employeeKey, r.employeeName);

  if (employees.size < 25) {
    const additionalUsers = await prisma.user.findMany({
      where: {
        tenantId: session.tenantId,
        status: "ACTIVE",
        role: { notIn: ["CANDIDATE", "SUPER_ADMIN", "TENANT_ADMIN"] },
        id: { notIn: Array.from(employees.keys()) },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
      take: 25 - employees.size,
    });
    for (const u of additionalUsers) {
      employees.set(u.id, `${u.firstName} ${u.lastName}`);
    }
  }

  const rows = Array.from(employees.entries()).map(([key, name]) => {
    const cells: Array<{ day: number; type: LeaveType | null; color: string | null }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const r = requests.find(
        (rq) => rq.employeeKey === key && rq.startDate <= date && rq.endDate >= date
      );
      cells.push({
        day: d,
        type: r?.type ?? null,
        color: r ? TYPE_COLOR[r.type] : null,
      });
    }
    return { employeeKey: key, employeeName: name, cells };
  });

  return NextResponse.json({
    month,
    daysInMonth,
    rows,
    legend: Object.entries(TYPE_COLOR).map(([type, color]) => ({ type, color })),
  });
}
