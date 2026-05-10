import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, LeaveType } from "@prisma/client";
import { getSyntheticPersonnel } from "@/lib/rh-personnel";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const TYPE_COLOR: Record<LeaveType, string> = {
  PAID_LEAVE: "#22C55E",
  RTT: "#A855F7",
  UNPAID: "#94A3B8",
  SICK: "#EF4444",
  MATERNITY: "#EC4899",
  PATERNITY: "#3B82F6",
  FAMILY: "#F59E0B",
  OTHER: "#64748B",
};

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

  // Sélection : top 25 employés concernés (priorité requests réelles + complément synthétique)
  const employees = new Map<string, string>();
  for (const r of requests) employees.set(r.employeeKey, r.employeeName);
  const synthetic = getSyntheticPersonnel(487).slice(0, 25 - employees.size);
  for (const p of synthetic) {
    if (!employees.has(p.id)) employees.set(p.id, `${p.firstName} ${p.lastName}`);
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
